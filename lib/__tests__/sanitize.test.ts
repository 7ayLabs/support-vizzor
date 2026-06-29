import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.SUPPORT_RATE_LIMIT_SALT = 'test-rate-salt';
  process.env.SUPPORT_TICKET_ID_SALT = 'test-ticket-salt';
  process.env.SUPPORT_SSO_JWT_SECRET = 'test-jwt-secret';
});

describe('cleanText', () => {
  it('preserves normal user text', async () => {
    const { cleanText } = await import('../tickets/sanitize');
    expect(cleanText('Hello world\nLine two')).toBe('Hello world\nLine two');
  });

  it('collapses excessive blank lines', async () => {
    const { cleanText } = await import('../tickets/sanitize');
    expect(cleanText('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('strips ASCII control characters', async () => {
    const { cleanText } = await import('../tickets/sanitize');
    expect(cleanText('hello\x07world')).toBe('helloworld');
  });

  it('normalises CRLF to LF', async () => {
    const { cleanText } = await import('../tickets/sanitize');
    expect(cleanText('a\r\nb')).toBe('a\nb');
  });
});

describe('looksLikeWallet', () => {
  it('accepts a Solana-shaped base58 string', async () => {
    const { looksLikeWallet } = await import('../tickets/sanitize');
    expect(looksLikeWallet('4AzVF7Cp9NwLAh7Vmh7Pq2K1B5kFq7wKj3HfL8E6n9Az')).toBe(
      true,
    );
  });

  it('rejects free-form text', async () => {
    const { looksLikeWallet } = await import('../tickets/sanitize');
    expect(looksLikeWallet('my wallet')).toBe(false);
  });

  it('rejects something HTML-ish', async () => {
    const { looksLikeWallet } = await import('../tickets/sanitize');
    expect(looksLikeWallet('<script>x</script>')).toBe(false);
  });
});

describe('clampString', () => {
  it('truncates to the maximum', async () => {
    const { clampString } = await import('../tickets/sanitize');
    expect(clampString('abcdefghij', 4)).toBe('abcd');
  });
  it('passes through shorter strings unchanged', async () => {
    const { clampString } = await import('../tickets/sanitize');
    expect(clampString('hi', 100)).toBe('hi');
  });
});
