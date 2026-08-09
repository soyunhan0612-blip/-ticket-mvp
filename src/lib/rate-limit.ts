export function createRateLimiter(config: {
  windowMs: number;
  maxRequests: number;
}): {
  check(key: string): { allowed: boolean; retryAfterMs?: number };
} {
  const requestsByKey = new Map<string, number[]>();

  return {
    check(key) {
      const now = Date.now();
      const windowStart = now - config.windowMs;
      const recentRequests = (requestsByKey.get(key) ?? []).filter(
        (timestamp) => timestamp > windowStart,
      );

      if (recentRequests.length >= config.maxRequests) {
        requestsByKey.set(key, recentRequests);
        return {
          allowed: false,
          retryAfterMs: Math.max(
            1,
            recentRequests[0] + config.windowMs - now,
          ),
        };
      }

      recentRequests.push(now);
      requestsByKey.set(key, recentRequests);
      return { allowed: true };
    },
  };
}
