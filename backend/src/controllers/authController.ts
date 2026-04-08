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
    name: name.trim(),
    phone: normalizedPhone,
    passwordHash,
    role,
    location: location?.trim() ?? '',
    languagePreference: languagePreference ?? 'en',
    isVerified: true,
    trust_score: 5,
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
