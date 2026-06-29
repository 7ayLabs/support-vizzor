import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

beforeAll(() => {
  process.env.SUPPORT_RATE_LIMIT_SALT = 'test-rate-salt';
  process.env.SUPPORT_TICKET_ID_SALT = 'test-ticket-salt';
  process.env.SUPPORT_SSO_JWT_SECRET = 'test-jwt-secret';
});

beforeEach(async () => {
  const workdir = mkdtempSync(join(tmpdir(), 'support-vizzor-rl-'));
  process.env.SUPPORT_DB_PATH = join(workdir, 'support.db');
  const { _resetForTests } = await import('../tickets/db');
  _resetForTests();
});

describe('consume', () => {
  it('allows up to capacity requests, then blocks', async () => {
    const { consume } = await import('../security/rate-limit');
    const opts = { capacity: 3, refillPerHour: 0 };
    expect(consume('1.2.3.4', 'test', opts).allowed).toBe(true);
    expect(consume('1.2.3.4', 'test', opts).allowed).toBe(true);
    expect(consume('1.2.3.4', 'test', opts).allowed).toBe(true);
    const denied = consume('1.2.3.4', 'test', opts);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('isolates buckets by IP', async () => {
    const { consume } = await import('../security/rate-limit');
    const opts = { capacity: 1, refillPerHour: 0 };
    expect(consume('5.5.5.5', 'test', opts).allowed).toBe(true);
    expect(consume('5.5.5.5', 'test', opts).allowed).toBe(false);
    expect(consume('6.6.6.6', 'test', opts).allowed).toBe(true);
  });

  it('isolates buckets by scope', async () => {
    const { consume } = await import('../security/rate-limit');
    const opts = { capacity: 1, refillPerHour: 0 };
    expect(consume('7.7.7.7', 'scope-a', opts).allowed).toBe(true);
    expect(consume('7.7.7.7', 'scope-b', opts).allowed).toBe(true);
  });
});

describe('hashIp', () => {
  it('produces a stable hex digest', async () => {
    const { hashIp } = await import('../security/rate-limit');
    expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'));
    expect(hashIp('1.2.3.4')).not.toBe(hashIp('1.2.3.5'));
    expect(hashIp('1.2.3.4')).toHaveLength(64);
  });
});
