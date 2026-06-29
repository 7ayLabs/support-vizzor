/**
 * GET /api/auth/me — current support-side identity.
 *
 * Reads the local __Host-support.auth cookie set after a successful
 * SSO handoff. Returns { signedIn: false } when anonymous; never
 * proxies to vizzor.ai (the cross-subdomain SSO is a deliberate
 * redirect-based handoff, not a cookie share — see lib/auth/sso.ts).
 */

import { NextResponse } from 'next/server';
import { readIdentity } from '@/lib/auth/identity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const sess = await readIdentity();
  if (!sess) {
    return NextResponse.json(
      { signedIn: false },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return NextResponse.json(
    {
      signedIn: true,
      wallet: sess.wallet,
      expiresAt: sess.expiresAt,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
