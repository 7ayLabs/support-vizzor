/**
 * Read the current support-side identity from the request cookie.
 * Returns null when anonymous — support tickets are deliberately
 * fileable without auth.
 */

import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, verifySessionToken, type SsoSession } from './sso';

export async function readIdentity(): Promise<SsoSession | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  return verifySessionToken(raw);
}
