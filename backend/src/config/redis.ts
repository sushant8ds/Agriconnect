import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || '';

// Create a no-op redis stub for when Redis is unavailable
class NoopRedis {
  async incr(_key: string) { return 1; }
  async expire(_key: string, _ttl: number) { return 1; }
  async get(_key: string) { return null; }
  async set(_key: string, _val: any, ..._args: any[]) { return 'OK'; }
  async del(_key: string) { return 1; }
  async quit() {}
  on(_event: string, _handler: any) { return this; }
}

let redisClient: Redis | NoopRedis;

if (REDIS_URL) {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  client.on('connect', () => console.log('Redis connected'));
  client.on('error', (err) => console.warn('[Redis] Error (non-fatal):', err.message));
  redisClient = client;
} else {
  console.log('[Redis] No REDIS_URL set — using in-memory stub (rate limiting disabled)');
  redisClient = new NoopRedis() as any;
}

export const redis = redisClient as Redis;

export async function connectRedis(): Promise<void> {
  if (REDIS_URL && redis instanceof Redis) {
    try {
      await redis.connect();
    } catch (err) {
      console.warn('[Redis] Could not connect — continuing without Redis:', (err as Error).message);
    }
  }
}
