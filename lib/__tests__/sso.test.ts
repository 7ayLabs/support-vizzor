import { describe, it, expect, beforeAll } from 'vitest';
import { createHmac } from 'node:crypto';

beforeAll(() => {
  process.env.SUPPORT_RATE_LIMIT_SALT = 'test-rate-salt';
  process.env.SUPPORT_TICKET_ID_SALT = 'test-ticket-salt';
  process.env.SUPPORT_SSO_JWT_SECRET = 'test-jwt-secret';
});

function makeHandoff(opts: {
  sub?: string;
  aud?: string;
  iat?: number;
  exp?: number;
  secret?: string;
  alg?: string;
}): string {
  const header = { alg: opts.alg ?? 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: opts.sub ?? '4Az11111111111111111111111111111111111111',
    aud: opts.aud ?? 'support.vizzor.ai',
    iat: opts.iat ?? now,
    exp: opts.exp ?? now + 60,
  };
  const b64 = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  const h = b64(header);
  const p = b64(payload);
  const sig = createHmac('sha256', opts.secret ?? 'test-jwt-secret')
    .update(`${h}.${p}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${h}.${p}.${sig}`;
}

describe('verifyHandoffToken', () => {
  it('accepts a valid token and returns the wallet', async () => {
    const { verifyHandoffToken } = await import('../auth/sso');
    const tok = makeHandoff({ sub: 'WALLET1' });
    expect(verifyHandoffToken(tok)).toBe('WALLET1');
  });

  it('rejects a tampered signature', async () => {
    const { verifyHandoffToken } = await import('../auth/sso');
    const tok = makeHandoff({});
    const broken = tok.slice(0, -2) + 'AA';
    expect(() => verifyHandoffToken(broken)).toThrow();
  });

  it('rejects the wrong audience', async () => {
    const { verifyHandoffToken } = await import('../auth/sso');
    const tok = makeHandoff({ aud: 'evil.example' });
    expect(() => verifyHandoffToken(tok)).toThrow(/audience/);
  });

  it('rejects an expired token', async () => {
    const { verifyHandoffToken } = await import('../auth/sso');
    const tok = makeHandoff({ exp: Math.floor(Date.now() / 1000) - 1 });
    expect(() => verifyHandoffToken(tok)).toThrow(/expired/);
  });

  it('rejects a stale handoff (iat too old)', async () => {
    const { verifyHandoffToken } = await import('../auth/sso');
    const tok = makeHandoff({
      iat: Math.floor(Date.now() / 1000) - 120,
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    expect(() => verifyHandoffToken(tok)).toThrow(/stale/);
  });

  it('rejects an alg-confusion attempt (alg=none)', async () => {
    const { verifyHandoffToken } = await import('../auth/sso');
    const tok = makeHandoff({ alg: 'none' });
    expect(() => verifyHandoffToken(tok)).toThrow();
  });
});

describe('issueSessionToken / verifySessionToken', () => {
  it('round-trips a wallet', async () => {
    const { issueSessionToken, verifySessionToken } = await import(
      '../auth/sso'
    );
    const { token } = issueSessionToken('WALLET2');
    const sess = verifySessionToken(token);
    expect(sess?.wallet).toBe('WALLET2');
  });

  it('rejects a tampered session token', async () => {
    const { issueSessionToken, verifySessionToken } = await import(
      '../auth/sso'
    );
    const { token } = issueSessionToken('WALLET3');
    const broken = token.slice(0, -2) + 'AA';
    expect(verifySessionToken(broken)).toBeNull();
  });
});
