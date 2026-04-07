import { Request, Response } from 'express';
import { HydratedDocument } from 'mongoose';
import { User, IUser, UserRole, LanguagePreference } from '../models/User';
import { generateAndSendOtp, verifyOtp as verifyOtpService } from '../services/otpService';
import { generateToken, generateRefreshToken, JwtPayload } from '../middleware/auth';

const VALID_ROLES: UserRole[] = ['Farmer', 'Service_Provider', 'Admin'];
const VALID_LANGUAGES: LanguagePreference[] = ['en', 'hi', 'kn', 'mr', 'te', 'ta', 'ml'];

/**
 * POST /auth/login
 * Accepts phone + role, upserts user, generates OTP, sends SMS.
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { phone, role, name, location, languagePreference } = req.body as {
      phone?: string;
      role?: string;
      name?: string;
      location?: string;
      languagePreference?: string;
    };

    if (!phone || typeof phone !== 'string' || !/^\+?[1-9]\d{6,14}$/.test(phone.trim())) {
      res.status(400).json({ error: 'A valid phone number is required' });
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

    let user = await User.findOne({ phone: normalizedPhone }) as HydratedDocument<IUser> | null;

    if (!user) {
      user = new User({
        phone: normalizedPhone,
        role: role as UserRole,
        name: name?.trim() ?? '',
        location: location?.trim() ?? '',
        languagePreference: (languagePreference as LanguagePreference) ?? 'en',
      }) as HydratedDocument<IUser>;
    } else {
      user.role = role as UserRole;
      if (name?.trim()) user.name = name.trim();
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated. Please contact support.' });
      return;
    }

    await user.save();

    const devOtp = await generateAndSendOtp(user);
    const isDev = !process.env.TWILIO_ACCOUNT_SID;

    res.status(200).json({
      message: 'OTP sent successfully. Please verify to continue.',
      ...(isDev && devOtp ? { devOtp } : {}),
    });
  } catch (err) {
    console.error('[login] Error:', err);
    res.status(500).json({ error: 'Failed to send OTP. Please try again later.' });
  }
}

/**
 * POST /auth/verify-otp
 * Validates OTP, issues JWT and refresh token on success.
 */
export async function verifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const { phone, otp } = req.body as { phone?: string; otp?: string };

    if (!phone || typeof phone !== 'string') {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }

    if (!otp || typeof otp !== 'string') {
      res.status(400).json({ error: 'OTP is required' });
      return;
    }

    const user = await User.findOne({ phone: phone.trim() }) as HydratedDocument<IUser> | null;

    if (!user) {
      res.status(404).json({ error: 'No account found for this phone number.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated. Please contact support.' });
      return;
    }

    try {
      await verifyOtpService(user, otp.trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OTP verification failed';
      if (message.includes('locked')) {
        res.status(423).json({ error: message });
      } else if (message.includes('expired') || message.includes('Incorrect') || message.includes('No OTP')) {
        res.status(401).json({ error: message });
      } else {
        res.status(400).json({ error: message });
      }
      return;
    }

    const payload: JwtPayload = {
      userId: String(user._id),
      role: user.role,
      phone: user.phone,
    };

    const accessToken = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    if (user.role === 'Service_Provider') {
      seedProviderDemoData(String(user._id)).catch(() => {});
    }

    res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: String(user._id),
        name: user.name,
        role: user.role,
        languagePreference: user.languagePreference,
      },
    });
  } catch (err) {
    console.error('[verifyOtp] Error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
}

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
      const prices = [1200, 7500, 450];
      const descs = [
        'Tractor-trolley transport to mandi, capacity 3 tonnes',
        'Drip irrigation installation for 1 acre, saves 60% water',
        'Experienced weeding team, 5 workers per day',
      ];
      services = await Service.insertMany(serviceTypes.map((type, i) => ({
        provider_id: providerId,
        type, category: type,
        price: prices[i],
        description: descs[i],
        availability: true,
        status: 'active',
        averageRating: 4.2 + i * 0.2,
        ratingCount: 10 + i * 5,
        priceTrend: 'stable',
        location: { type: 'Point', coordinates: [74.4977, 15.8497] },
      })));
    }

    const farmer = await User.findOne({ role: 'Farmer' });
    if (!farmer) return;

    const statuses = ['Pending', 'Accepted', 'Completed', 'Pending', 'InProgress'] as const;
    const slots = ['08:00-10:00', '10:00-12:00', '14:00-16:00', '10:00-12:00', '08:00-10:00'];

    await Booking.insertMany(statuses.map((status, i) => ({
      farmer_id: farmer._id,
      service_id: services[i % services.length]._id,
      provider_id: providerId,
      status,
      date: new Date(Date.now() + (i - 2) * 86400000),
      timeSlot: slots[i],
      feedbackPromptSent: status === 'Completed',
    })));
  } catch (err) {
    console.error('[SeedProvider] Failed:', err);
  }
}
