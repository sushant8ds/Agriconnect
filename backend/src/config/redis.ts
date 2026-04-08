import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || '';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  enableOfflineQueue: false,
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', () => {}); // suppress error logs when Redis unavailable

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
  } catch {
    console.warn('Redis unavailable — caching disabled');
  }
}
