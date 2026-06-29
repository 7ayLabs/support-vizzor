/**
 * Strict env accessors. Required values throw on FIRST USE in
 * production — not at module load — so Next.js can analyze route
 * modules at build time without secrets in scope. Falls back to a
 * marked dev value in non-prod for the same lazy reason.
 *
 * This file is the only place that should read `process.env`.
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
  get supportOrigin() {
    return optional('NEXT_PUBLIC_SUPPORT_ORIGIN', 'http://localhost:3000');
  },
  get vizzorOrigin() {
    return optional('NEXT_PUBLIC_VIZZOR_ORIGIN', 'https://vizzor.ai');
  },
  get rateLimitSalt() {
    return required('SUPPORT_RATE_LIMIT_SALT');
  },
  get ticketIdSalt() {
    return required('SUPPORT_TICKET_ID_SALT');
  },
  get ssoJwtSecret() {
    return required('SUPPORT_SSO_JWT_SECRET');
  },
  get triageWebhookUrl() {
    return optional('SUPPORT_TRIAGE_WEBHOOK_URL');
  },
  get trustedProxies() {
    return optional('SUPPORT_TRUSTED_PROXIES', '127.0.0.1,::1')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  },
};
