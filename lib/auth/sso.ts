/**
 * SSO handoff from vizzor.ai to support.vizzor.ai.
 *
 * site-vizzor's auth cookie is `__Host-vizzor.auth` — the `__Host-`
 * prefix forbids the `Domain` attribute, so the cookie is host-only
 * and CANNOT be read by support.vizzor.ai. A cross-subdomain SSO
 * therefore needs a deliberate handoff, not a "share the cookie" trick.
 *
 * The contract (to be implemented in site-vizzor as a follow-up):
 *
 *   1. User on support.vizzor.ai clicks "Sign in".
 *   2. Browser redirected to:
 *        https://vizzor.ai/auth/sso?return_to=https://support.vizzor.ai/api/auth/sso/return
 *   3. vizzor.ai verifies its own __Host-vizzor.auth cookie, then mints
 *      a short-lived JWT (HS256, exp ≤ 60s, aud = "support.vizzor.ai",
 *      sub = wallet address) signed with SUPPORT_SSO_JWT_SECRET.
 *   4. vizzor.ai redirects back to `return_to?token=…`.
 *   5. /api/auth/sso/return verifies the JWT (this module) and sets a
 *      local __Host-support.auth cookie scoped to support.vizzor.ai.
 *   6. Subsequent calls to /api/auth/me read the local cookie.
 *
 * This module deliberately does NOT contain the JWT signing logic for
 * step 3 — that belongs to site-vizzor's auth surface (it owns the
 * SIWS session). support-vizzor only verifies what arrives.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';

const COOKIE_NAME = env.isProd ? '__Host-support.auth' : 'support.auth';
const SESSION_TTL_S = 60 * 60 * 24 * 7; // 7d

export interface SsoSession {
  wallet: string;
  expiresAt: number;
}

interface HandoffPayload {
  sub: string; // wallet address
  aud: string; // must be "support.vizzor.ai"
  iat: number;
  exp: number;
}

function base64UrlDecode(s: string): Buffer {
  return Buffer.from(
    s.replace(/-/g, '+').replace(/_/g, '/') +
      '='.repeat((4 - (s.length % 4)) % 4),
    'base64',
  );
}

function base64UrlEncode(b: Buffer): string {
  return b
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Verify a handoff JWT from site-vizzor. HS256 only (no algorithm
 * negotiation — alg-confusion attacks killed JWTs that allowed it).
 * Returns the wallet address on success, throws otherwise.
 */
export function verifyHandoffToken(token: string): string {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('malformed_token');
  const [headerB64, payloadB64, sigB64] = parts;

  const header = JSON.parse(base64UrlDecode(headerB64).toString('utf8')) as {
    alg?: string;
    typ?: string;
  };
  if (header.alg !== 'HS256' || header.typ !== 'JWT') {
    throw new Error('bad_header');
  }

  const expected = createHmac('sha256', env.ssoJwtSecret)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  const actual = base64UrlDecode(sigB64);
  if (
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  ) {
    throw new Error('bad_signature');
  }

  const payload = JSON.parse(
    base64UrlDecode(payloadB64).toString('utf8'),
  ) as HandoffPayload;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error('expired');
  if (payload.aud !== 'support.vizzor.ai') throw new Error('bad_audience');
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('missing_subject');
  }
  // 60-second handoff window — anything older was either replayed or
  // the user sat on the redirect page too long. Re-issue.
  if (now - payload.iat > 60) throw new Error('stale_handoff');

  return payload.sub;
}

/**
 * Issue a local support-side session token. Distinct from the handoff
 * JWT — this is a longer-lived opaque token, HMAC'd against the same
 * secret so rotation invalidates everything in one shot.
 */
export function issueSessionToken(wallet: string): {
  token: string;
  expiresAt: number;
} {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_S;
  const body = `${wallet}.${expiresAt}`;
  const sig = createHmac('sha256', env.ssoJwtSecret).update(body).digest();
  return {
    token: `${body}.${base64UrlEncode(sig)}`,
    expiresAt: expiresAt * 1000,
  };
}

export function verifySessionToken(token: string): SsoSession | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [wallet, expStr, sigB64] = parts;
  const exp = Number.parseInt(expStr, 10);
  if (!Number.isFinite(exp)) return null;
  if (exp * 1000 < Date.now()) return null;

  const expected = createHmac('sha256', env.ssoJwtSecret)
    .update(`${wallet}.${expStr}`)
    .digest();
  const actual = base64UrlDecode(sigB64);
  if (
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  ) {
    return null;
  }
  return { wallet, expiresAt: exp * 1000 };
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
