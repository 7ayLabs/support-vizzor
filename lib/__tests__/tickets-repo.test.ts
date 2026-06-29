import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

beforeAll(() => {
  process.env.SUPPORT_RATE_LIMIT_SALT = 'test-rate-salt';
  process.env.SUPPORT_TICKET_ID_SALT = 'test-ticket-salt';
  process.env.SUPPORT_SSO_JWT_SECRET = 'test-jwt-secret';
});

let workdir: string;

beforeEach(async () => {
  workdir = mkdtempSync(join(tmpdir(), 'support-vizzor-test-'));
  process.env.SUPPORT_DB_PATH = join(workdir, 'support.db');
  const { _resetForTests } = await import('../tickets/db');
  _resetForTests();
});

describe('createTicket', () => {
  it('mints a unique short code per ticket', async () => {
    const { createTicket } = await import('../tickets/repo');
    const a = createTicket({
      category: 'bug',
      title: 'first',
      description: 'description of the first ticket',
    });
    const b = createTicket({
      category: 'feature',
      title: 'second',
      description: 'description of the second ticket',
    });
    expect(a.code).not.toBe(b.code);
    expect(a.code).toMatch(/^VZS-[0-9A-Z]{4}$/);
    expect(b.code).toMatch(/^VZS-[0-9A-Z]{4}$/);
    rmSync(workdir, { recursive: true, force: true });
  });

  it('stores the wallet address when provided', async () => {
    const { createTicket, getTicketByCode } = await import('../tickets/repo');
    const t = createTicket({
      category: 'question',
      title: 'who am I',
      description: 'do tickets remember who filed them',
      walletAddress: 'WALLET123',
    });
    const fetched = getTicketByCode(t.code);
    expect(fetched?.walletAddress).toBe('WALLET123');
    rmSync(workdir, { recursive: true, force: true });
  });

  it('returns tickets in reverse-chronological order for a wallet', async () => {
    const { createTicket, listTicketsForWallet } = await import(
      '../tickets/repo'
    );
    const t1 = createTicket({
      category: 'bug',
      title: 'one',
      description: 'one one one one one',
      walletAddress: 'WALLET_X',
    });
    await new Promise((r) => setTimeout(r, 10));
    const t2 = createTicket({
      category: 'bug',
      title: 'two',
      description: 'two two two two two',
      walletAddress: 'WALLET_X',
    });
    const list = listTicketsForWallet('WALLET_X');
    expect(list.map((t) => t.code)).toEqual([t2.code, t1.code]);
    rmSync(workdir, { recursive: true, force: true });
  });
});
