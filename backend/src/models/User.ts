import { Schema, model, Document } from 'mongoose';

export type UserRole = 'Farmer' | 'Service_Provider' | 'Admin';
export type LanguagePreference = 'en' | 'hi' | 'kn' | 'mr' | 'te' | 'ta' | 'ml';

export interface IUser extends Document {
  name: string;
  phone: string;
  passwordHash?: string;
  isVerified: boolean;       // true after OTP confirmed at registration
  role: UserRole;
  location: string;
  languagePreference: LanguagePreference;
  trust_score: number;
  isActive: boolean;
  otpHash?: string;
  otpExpiry?: Date;
  otpAttempts: number;
  otpLockedUntil?: Date;
  fcmToken?: string;
  alertPreferences: string[];
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, default: '' },
    phone: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String },
    isVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['Farmer', 'Service_Provider', 'Admin'], required: true },
    location: { type: String, default: '' },
    languagePreference: {
      type: String,
      enum: ['en', 'hi', 'kn', 'mr', 'te', 'ta', 'ml'],
      default: 'en',
    },
    trust_score: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    otpHash: { type: String },
    otpExpiry: { type: Date },
    otpAttempts: { type: Number, default: 0 },
    otpLockedUntil: { type: Date },
    fcmToken: { type: String },
    alertPreferences: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
