/**
 * Public short codes for tickets, e.g. VZS-7K2M.
 *
 * Generated from (row_id ⊕ HMAC(salt, row_id)) so codes don't leak
 * row order or volume. Crockford-base32 alphabet excludes I/L/O/U to
 * dodge ambiguous characters when read aloud or written down.
 */

import { createHmac } from 'node:crypto';
import { env } from '@/lib/env';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function toBase32(n: number): string {
  let out = '';
  let v = n;
  while (v > 0) {
    out = ALPHABET[v & 0x1f] + out;
    v >>>= 5;
  }
  return out || '0';
}

export function makeCode(rowId: number): string {
  const mac = createHmac('sha256', env.ticketIdSalt)
    .update(String(rowId))
    .digest();
  const mixed = (rowId ^ mac.readUInt32BE(0)) >>> 0;
  const payload = toBase32(mixed).padStart(4, '0').slice(-4);
  return `VZS-${payload}`;
}
