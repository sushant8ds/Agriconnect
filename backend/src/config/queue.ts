import { Queue } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || '';

// Parse Redis URL into host/port for BullMQ
function getConnection() {
  if (!REDIS_URL) return null;
  try {
    const url = new URL(REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      tls: url.protocol === 'rediss:' ? {} : undefined,
    };
  } catch {
    return null;
  }
}

const connection = getConnection();

// Only create queues if Redis is available
export const notificationQueue   = connection ? new Queue('notifications',      { connection }) : null;
export const trustScoreQueue     = connection ? new Queue('trust-score',        { connection }) : null;
export const pricePredictionQueue = connection ? new Queue('price-prediction',  { connection }) : null;
export const calendarQueue       = connection ? new Queue('farming-calendar',   { connection }) : null;
export const bookingAutoCancel   = connection ? new Queue('booking-auto-cancel',{ connection }) : null;

export const redisConnection = connection;
