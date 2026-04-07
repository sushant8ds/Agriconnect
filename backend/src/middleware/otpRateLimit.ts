import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';

const MAX_OTP_REQUESTS = 5;
const TTL_SECONDS = 3600; // 1 hour

/**
 * Rate-limits OTP requests to max 5 per phone number per hour.
 * Requirements: 18.2
 */
export async function otpRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const phone = req.body?.phone as string | undefined;

  if (!phone) {
    next();
    return;
  }

  const key = `otp_rate:${phone.trim()}`;

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      // First request — set expiry
      await redis.expire(key, TTL_SECONDS);
    }

    if (count > MAX_OTP_REQUESTS) {
      res.status(429).json({ error: 'Too many OTP requests. Please try again after 1 hour.' });
      return;
    }
  } catch (err) {
    // Redis unavailable — fail open so OTP flow still works
    console.warn('[otpRateLimit] Redis error, skipping rate limit:', err);
  }

  next();
}
