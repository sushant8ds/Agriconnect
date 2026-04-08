import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { generateToken, generateRefreshToken, JwtPayload } from '../middleware/auth';

const VALID_ROLES = ['Farmer', 'Service_Provider', 'Admin'];

export async function register(req: Request, res: Response): Promise<void> {
  const { name, phone, password, role, location, languagePreference } = req.body;

  if (!name?.trim()) { res.status(400).json({ error: 'Name is required' }); return; }
  if (!phone?.trim()) { res.status(400).json({ error: 'Phone is required' }); return; }
  if (!password || password.length < 6) { res.status(400).json({ error: 'Password must be at least 6 characters' }); return; }
  if (!role || !VALID_ROLES.includes(role)) { res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` }); return; }

  const normalizedPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim().replace(/\D/g, '')}`;
  const existing = await User.findOne({ phone: normalizedPhone });
  if (existing) { res.status(409).json({ error: 'An account with this phone already exists' }); return; }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(), phone: normalizedPhone, passwordHash, role,
    location: location?.trim() ?? '', languagePreference: languagePreference ?? 'en',
    isVerified: true, trust_score: 5,
  });

  const payload: JwtPayload = { userId: user._id.toString(), role: user.role, phone: user.phone };
  res.status(201).json({
    accessToken: generateToken(payload),
    refreshToken: generateRefreshToken(payload),
    user: { id: user._id, name: user.name, phone: user.phone, role: user.role, languagePreference: user.languagePreference },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { phone, password, role } = req.body;

  if (!phone?.trim()) { res.status(400).json({ error: 'Phone is required' }); return; }
  if (!password) { res.status(400).json({ error: 'Password is required' }); return; }
  if (!role || !VALID_ROLES.includes(role)) { res.status(400).json({ error: 'Please select a role' }); return; }

  const normalizedPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim().replace(/\D/g, '')}`;
  const user = await User.findOne({ phone: normalizedPhone });
  if (!user) { res.status(401).json({ error: 'No account found with this phone number' }); return; }
  if (!user.isActive) { res.status(403).json({ error: 'Account is deactivated. Please contact support.' }); return; }
  if (user.role !== role) {
    res.status(403).json({ error: `This account is registered as ${user.role}, not ${role}. Please select the correct role.` });
    return;
  }
  if (!user.passwordHash) { res.status(401).json({ error: 'Invalid credentials' }); return; }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) { res.status(401).json({ error: 'Invalid phone or password' }); return; }

  const payload: JwtPayload = { userId: user._id.toString(), role: user.role, phone: user.phone };
  res.status(200).json({
    accessToken: generateToken(payload),
    refreshToken: generateRefreshToken(payload),
    user: { id: user._id, name: user.name, phone: user.phone, role: user.role, languagePreference: user.languagePreference },
  });
}

/**
 * POST /auth/forgot-password
 * Generates a 6-digit OTP, stores it hashed in the User document, and sends via SMS (or logs in dev).
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { phone } = req.body;
  if (!phone?.trim()) { res.status(400).json({ error: 'Phone is required' }); return; }

  const normalizedPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim().replace(/\D/g, '')}`;
  const user = await User.findOne({ phone: normalizedPhone });

  // Always return success to prevent phone enumeration
  if (!user) { res.json({ message: 'If this phone is registered, an OTP has been sent.' }); return; }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 8);
  user.otpHash = otpHash;
  user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  user.otpAttempts = 0;
  await user.save();

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] Password reset OTP for ${normalizedPhone}: ${otp}`);
  } else {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `Your KisanServe password reset OTP is: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: normalizedPhone,
      });
    } catch (err) {
      console.error('SMS send failed:', err);
    }
  }

  res.json({ message: 'If this phone is registered, an OTP has been sent.' });
}

/**
 * POST /auth/reset-password
 * Verifies OTP and sets the new password.
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { phone, otp, newPassword } = req.body;

  if (!phone?.trim()) { res.status(400).json({ error: 'Phone is required' }); return; }
  if (!otp?.trim()) { res.status(400).json({ error: 'OTP is required' }); return; }
  if (!newPassword || newPassword.length < 6) { res.status(400).json({ error: 'New password must be at least 6 characters' }); return; }

  const normalizedPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim().replace(/\D/g, '')}`;
  const user = await User.findOne({ phone: normalizedPhone });

  if (!user || !user.otpHash || !user.otpExpiry) {
    res.status(400).json({ error: 'No OTP request found. Please request a new OTP.' });
    return;
  }
  if (new Date() > user.otpExpiry) {
    res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    return;
  }
  if ((user.otpAttempts ?? 0) >= 5) {
    res.status(429).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    return;
  }

  const valid = await bcrypt.compare(otp.trim(), user.otpHash);
  if (!valid) {
    user.otpAttempts = (user.otpAttempts ?? 0) + 1;
    await user.save();
    res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    return;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.otpHash = undefined;
  user.otpExpiry = undefined;
  user.otpAttempts = 0;
  await user.save();

  res.json({ message: 'Password reset successfully. You can now log in.' });
}
