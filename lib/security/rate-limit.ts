/**
 * Token-bucket rate limiter keyed by HMAC(salt, ip). Persists in the
 * same SQLite the tickets live in so the limit is observed across
 * worker restarts and across all Next.js route handlers (Node runtime).
 *
 * Defaults to 5 POSTs / hour / IP — generous enough that a frustrated
 * user can file two follow-ups, tight enough that a script spinning
 * up tickets hits the cap fast.
 */

import { createHmac } from 'node:crypto';
import { getDb } from '@/lib/tickets/db';
import { env } from '@/lib/env';

const DEFAULTS = {
  capacity: 5,
  refillPerHour: 5,
} as const;

export function hashIp(ip: string): string {
  return createHmac('sha256', env.rateLimitSalt).update(ip).digest('hex');
}

export interface BucketDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function consume(
  ip: string,
  scope: string,
  opts: { capacity?: number; refillPerHour?: number } = {},
): BucketDecision {
  const capacity = opts.capacity ?? DEFAULTS.capacity;
  const refill = opts.refillPerHour ?? DEFAULTS.refillPerHour;
  const refillPerMs = refill / (60 * 60 * 1000);
  const key = `${scope}:${hashIp(ip)}`;
  const now = Date.now();

  const db = getDb();
  return db.transaction(() => {
    const row = db
      .prepare('SELECT tokens, refilled_at FROM rate_buckets WHERE key = ?')
      .get(key) as { tokens: number; refilled_at: number } | undefined;

    let tokens = row ? row.tokens : capacity;
    const lastRefill = row ? row.refilled_at : now;
    tokens = Math.min(capacity, tokens + (now - lastRefill) * refillPerMs);

    if (tokens < 1) {
      const need = 1 - tokens;
      const retryAfterSeconds = Math.ceil(need / refillPerMs / 1000);
      db.prepare(
        `INSERT INTO rate_buckets (key, tokens, refilled_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET tokens = excluded.tokens, refilled_at = excluded.refilled_at`,
      ).run(key, tokens, now);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    tokens -= 1;
    db.prepare(
      `INSERT INTO rate_buckets (key, tokens, refilled_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET tokens = excluded.tokens, refilled_at = excluded.refilled_at`,
    ).run(key, tokens, now);
    return {
      allowed: true,
      remaining: Math.floor(tokens),
      retryAfterSeconds: 0,
    };
  })();
}
