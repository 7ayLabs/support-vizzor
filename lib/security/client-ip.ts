/**
 * Resolve the client IP from request headers. Only trusts the first
 * non-trusted hop in X-Forwarded-For when the immediate peer is in
 * SUPPORT_TRUSTED_PROXIES — otherwise falls back to the connection
 * peer to defeat header-spoofing from un-fronted requests.
 */

import { env } from '@/lib/env';

const PROXIES = new Set(env.trustedProxies);

export function resolveClientIp(req: Request, peer?: string | null): string {
  if (peer && !PROXIES.has(peer)) return peer;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean);
    for (const candidate of parts) {
      if (!PROXIES.has(candidate)) return candidate;
    }
  }
  const real = req.headers.get('x-real-ip');
  if (real && !PROXIES.has(real)) return real;
  return peer ?? '0.0.0.0';
}
