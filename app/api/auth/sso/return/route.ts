/**
 * GET /api/auth/sso/return?token=<handoff-jwt>
 *
 * Landing point of the cross-subdomain SSO redirect chain. vizzor.ai
 * (after verifying its own SIWS session) mints an HS256 JWT with
 * aud="support.vizzor.ai", signs it with the shared SUPPORT_SSO_JWT_SECRET,
 * and 302's the browser here. We verify, mint a local opaque session,
 * set the __Host-support.auth cookie, and bounce the user home.
 *
 * Failure modes (bad sig, expired, audience mismatch, stale handoff)
 * all redirect to / with ?error= for the UI to surface — never 5xx,
 * since this is a user-facing endpoint hit via redirect.
 */

import { NextResponse, type NextRequest } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  issueSessionToken,
  verifyHandoffToken,
} from '@/lib/auth/sso';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function bounce(req: NextRequest, error: string | null) {
  const origin = env.supportOrigin || new URL(req.url).origin;
  const url = new URL('/', origin);
  if (error) url.searchParams.set('error', error);
  return NextResponse.redirect(url, 302);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return bounce(req, 'missing_token');

  let wallet: string;
  try {
    wallet = verifyHandoffToken(token);
  } catch (e) {
    return bounce(req, (e as Error).message);
  }

  const { token: sessionToken, expiresAt } = issueSessionToken(wallet);

  const res = bounce(req, null);
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  });
  return res;
}
