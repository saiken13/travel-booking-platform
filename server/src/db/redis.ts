import Redis from 'ioredis';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy(times) {
        if (times > 5) return null; // Stop retrying after 5 attempts
        return Math.min(times * 100, 2000);
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    redisClient.on('connect', () => console.log('✅ Redis connected'));
    redisClient.on('error', (err) => {
      // Log but don't crash — cache misses are acceptable
      console.warn('⚠️  Redis error (cache disabled):', err.message);
    });
  }
  return redisClient;
};

export const safeGet = async (key: string): Promise<string | null> => {
  try {
    return await getRedisClient().get(key);
  } catch {
    return null;
  }
};

export const safeSetex = async (key: string, ttl: number, value: string): Promise<void> => {
  try {
    await getRedisClient().setex(key, ttl, value);
  } catch {
    // Cache write failure is non-fatal
  }
};

export const CACHE_TTL = {
  FLIGHT_SEARCH: 300,     // 5 minutes
  HOTEL_SEARCH: 300,
  EXPERIMENT_CONFIG: 3600, // 1 hour
};
