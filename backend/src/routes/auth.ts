import { Router } from 'express';
import { register, verifyPhone, login, forgotPassword, resetPassword } from '../controllers/authController';
import { otpRateLimit } from '../middleware/otpRateLimit';

const router = Router();

// POST /auth/register — new user: phone + password + role → sends OTP
router.post('/register', otpRateLimit, register);

// POST /auth/verify-phone — confirm OTP once at registration
router.post('/verify-phone', verifyPhone);

// POST /auth/login — existing user: phone + password → JWT (no OTP)
router.post('/login', login);

// POST /auth/forgot-password — send OTP to reset password
router.post('/forgot-password', otpRateLimit, forgotPassword);

// POST /auth/reset-password — verify OTP + set new password
router.post('/reset-password', resetPassword);

export default router;
