import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Types, HydratedDocument } from 'mongoose';
import { User, IUser, UserRole, LanguagePreference } from '../models/User';
import { generateAndSendOtp, verifyOtp as verifyOtpService } from '../services/otpService';
import { generateToken, generateRefreshToken, JwtPayload } from '../middleware/auth';

const VALID_ROLES: UserRole[] = ['Farmer', 'Service_Provider', 'Admin'];
const VALID_LANGUAGES: LanguagePreference[] = ['en', 'hi', 'kn', 'mr', 'te', 'ta', 'ml'];
const PASSWORD_MIN = 6;

/**
 * POST /auth/register
 * New user: phone + password + role → sends OTP to verify phone.
 * User is NOT active until they verify via /auth/verify-phone.
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { phone, password, role, name, location, languagePreference } = req.body as {
      phone?: string;
      password?: string;
      role?: string;
      name?: string;
      location?: string;
      languagePreference?: string;
    };

    if (!phone || !/^\+?[1-9]\d{6,14}$/.test(phone.trim())) {
      res.status(400).json({ error: 'A valid phone number is required' });
      return;
    }
    if (!password || password.length < PASSWORD_MIN) {
      res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN} characters` });
      return;
    }
    if (!role || !VALID_ROLES.includes(role as UserRole)) {
      res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
      return;
    }
    if (languagePreference && !VALID_LANGUAGES.includes(languagePreference as LanguagePreference)) {
      res.status(400).json({ error: `languagePreference must be one of: ${VALID_LANGUAGES.join(', ')}` });
      return;
    }

    const normalizedPhone = phone.trim();
    const existing = await User.findOne({ phone: normalizedPhone });

    if (existing?.isVerified) {
      res.status(409).json({ error: 'An account with this phone number already exists. Please login.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user: HydratedDocument<IUser>;
    if (existing) {
      // Unverified account — update it
      existing.passwordHash = passwordHash;
      existing.role = role as UserRole;
      if (name?.trim()) existing.name = name.trim();
      if (location?.trim()) existing.location = location.trim();
      if (languagePreference) existing.languagePreference = languagePreference as LanguagePreference;
      user = existing as HydratedDocument<IUser>;
    } else {
      user = new User({
        phone: normalizedPhone,
        passwordHash,
        role: role as UserRole,
        name: name?.trim() ?? '',
        location: location?.trim() ?? '',
        languagePreference: (languagePreference as LanguagePreference) ?? 'en',
        isVerified: false,
      }) as HydratedDocument<IUser>;
    }

    await user.save();

    const devOtp = await generateAndSendOtp(user);
    const isDev = !process.env.TWILIO_ACCOUNT_SID;

    res.status(200).json({
      message: 'OTP sent to your phone. Please verify to complete registration.',
      ...(isDev && devOtp ? { devOtp } : {}),
    });
  } catch (err) {
    console.error('[register] Error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
}

/**
 * POST /auth/verify-phone
 * Confirms OTP during registration. Marks user as verified.
 */
export async function verifyPhone(req: Request, res: Response): Promise<void> {
  try {
    const { phone, otp } = req.body as { phone?: string; otp?: string };

    if (!phone || !otp) {
      res.status(400).json({ error: 'Phone and OTP are required' });
      return;
    }

    const user = await User.findOne({ phone: phone.trim() }) as HydratedDocument<IUser> | null;
    if (!user) {
      res.status(404).json({ error: 'No registration found for this phone number.' });
      return;
    }

    try {
      await verifyOtpService(user, otp.trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OTP verification failed';
      if (message.includes('locked')) return void res.status(423).json({ error: message });
      return void res.status(401).json({ error: message });
    }

    user.isVerified = true;
    await user.save();

    const payload: JwtPayload = { userId: String(user._id), role: user.role, phone: user.phone };
    const accessToken = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    if (user.role === 'Service_Provider') {
      seedProviderDemoData(String(user._id)).catch(() => {});
    }

    res.status(200).json({
      message: 'Phone verified. Registration complete.',
      accessToken,
      refreshToken,
      user: { id: String(user._id), name: user.name, role: user.role, languagePreference: user.languagePreference },
    });
  } catch (err) {
    console.error('[verifyPhone] Error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
}

/**
 * POST /auth/login
 * Existing user: phone + password → JWT. No OTP needed.
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { phone, password } = req.body as { phone?: string; password?: string };

    if (!phone || !password) {
      res.status(400).json({ error: 'Phone and password are required' });
      return;
    }

    const user = await User.findOne({ phone: phone.trim() }) as HydratedDocument<IUser> | null;

    if (!user || !user.isVerified) {
      res.status(401).json({ error: 'No verified account found. Please register first.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated. Please contact support.' });
      return;
    }

    if (!user.passwordHash) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Incorrect password' });
      return;
    }

    const payload: JwtPayload = { userId: String(user._id), role: user.role, phone: user.phone };
    const accessToken = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.status(200).json({
      accessToken,
      refreshToken,
      user: { id: String(user._id), name: user.name, role: user.role, languagePreference: user.languagePreference },
    });
  } catch (err) {
    console.error('[login] Error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}

/**
 * POST /auth/forgot-password
 * Sends OTP to reset password for existing verified users.
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { phone } = req.body as { phone?: string };
    if (!phone) { res.status(400).json({ error: 'Phone is required' }); return; }

    const user = await User.findOne({ phone: phone.trim() }) as HydratedDocument<IUser> | null;
    if (!user?.isVerified) {
      // Don't reveal if account exists
      res.status(200).json({ message: 'If an account exists, an OTP has been sent.' });
      return;
    }

    const devOtp = await generateAndSendOtp(user);
    const isDev = !process.env.TWILIO_ACCOUNT_SID;

    res.status(200).json({
      message: 'OTP sent. Use it to reset your password.',
      ...(isDev && devOtp ? { devOtp } : {}),
    });
  } catch (err) {
    console.error('[forgotPassword] Error:', err);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
}

/**
 * POST /auth/reset-password
 * Verifies OTP then sets new password.
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { phone, otp, newPassword } = req.body as { phone?: string; otp?: string; newPassword?: string };

    if (!phone || !otp || !newPassword) {
      res.status(400).json({ error: 'Phone, OTP, and new password are required' });
      return;
    }
    if (newPassword.length < PASSWORD_MIN) {
      res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN} characters` });
      return;
    }

    const user = await User.findOne({ phone: phone.trim() }) as HydratedDocument<IUser> | null;
    if (!user?.isVerified) { res.status(404).json({ error: 'Account not found.' }); return; }

    try {
      await verifyOtpService(user, otp.trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OTP verification failed';
      return void res.status(401).json({ error: message });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: 'Password reset successfully. Please login.' });
  } catch (err) {
    console.error('[resetPassword] Error:', err);
    res.status(500).json({ error: 'Password reset failed.' });
  }
}

// Keep legacy verifyOtp export for any existing references
export { verifyPhone as verifyOtp };

async function seedProviderDemoData(providerId: string): Promise<void> {
  try {
    const { Booking } = await import('../models/Booking');
    const { Service } = await import('../models/Service');
    const { User } = await import('../models/User');

    const existing = await Booking.countDocuments({ provider_id: providerId });
    if (existing > 0) return;

    let services = await Service.find({ provider_id: providerId }).limit(3);
    if (services.length === 0) {
      const serviceTypes = ['Transport', 'Irrigation', 'Labor'] as const;
      services = await Service.insertMany(serviceTypes.map((type, i) => ({
        provider_id: new Types.ObjectId(providerId), type, category: type,
        price: [1200, 7500, 450][i],
        description: ['Tractor-trolley transport to mandi', 'Drip irrigation installation', 'Experienced weeding team'][i],
        availability: true, status: 'active',
        averageRating: 4.2 + i * 0.2, ratingCount: 10 + i * 5, priceTrend: 'stable',
        location: { type: 'Point', coordinates: [74.4977, 15.8497] },
      })));
    }

    const farmer = await User.findOne({ role: 'Farmer' });
    if (!farmer) return;

    const statuses = ['Pending', 'Accepted', 'Completed', 'Pending', 'InProgress'] as const;
    await Booking.insertMany(statuses.map((status, i) => ({
      farmer_id: farmer._id,
      service_id: services[i % services.length]._id,
      provider_id: providerId, status,
      date: new Date(Date.now() + (i - 2) * 86400000),
      timeSlot: ['08:00-10:00', '10:00-12:00', '14:00-16:00', '10:00-12:00', '08:00-10:00'][i],
      feedbackPromptSent: status === 'Completed',
    })));
  } catch (err) {
    console.error('[SeedProvider] Failed:', err);
  }
}
