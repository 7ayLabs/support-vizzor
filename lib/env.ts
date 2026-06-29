/**
 * Strict env accessors. Throws at boot if a required value is missing
 * in production, falls back to a marked dev value otherwise. This is
 * the only file that should read `process.env` directly.
 */

const isProd = process.env.NODE_ENV === 'production';

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    if (isProd) {
      throw new Error(`Required env ${name} is not set`);
    }
    return `dev-${name.toLowerCase()}`;
  }
  return v;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const env = {
  isProd,
  supportOrigin: optional(
    'NEXT_PUBLIC_SUPPORT_ORIGIN',
    'http://localhost:3000',
  ),
  vizzorOrigin: optional('NEXT_PUBLIC_VIZZOR_ORIGIN', 'https://vizzor.ai'),
  rateLimitSalt: required('SUPPORT_RATE_LIMIT_SALT'),
  ticketIdSalt: required('SUPPORT_TICKET_ID_SALT'),
  ssoJwtSecret: required('SUPPORT_SSO_JWT_SECRET'),
  triageWebhookUrl: optional('SUPPORT_TRIAGE_WEBHOOK_URL'),
  trustedProxies: optional(
    'SUPPORT_TRUSTED_PROXIES',
    '127.0.0.1,::1',
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
} as const;
