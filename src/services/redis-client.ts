import { Redis } from "@upstash/redis";

const globalForRedis = globalThis as typeof globalThis & {
  redisClient?: Redis;
};

export function hasRedisConfig(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

export function getRedisClient(): Redis {
  if (!hasRedisConfig()) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must both be configured",
    );
  }

  globalForRedis.redisClient ??= new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  return globalForRedis.redisClient;
}
