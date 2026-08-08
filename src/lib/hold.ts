export const HOLD_TTL_MS = 300_000;

export function isExpired(
  expiresAt: number,
  now: number = Date.now(),
): boolean {
  return expiresAt <= now;
}

export function createExpiresAt(now: number = Date.now()): number {
  return now + HOLD_TTL_MS;
}
