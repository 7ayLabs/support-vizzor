import { getDb } from './db';
import { makeCode } from './code';
import {
  CATEGORIES,
  STATUSES,
  type Category,
  type NewTicket,
  type Status,
  type Ticket,
} from './types';

interface Row {
  id: number;
  code: string;
  category: string;
  title: string;
  description: string;
  status: string;
  wallet_address: string | null;
  contact_handle: string | null;
  created_at: number;
  updated_at: number;
}

function fromRow(r: Row): Ticket {
  if (!CATEGORIES.includes(r.category as Category)) {
    throw new Error(`Corrupt category in DB: ${r.category}`);
  }
  if (!STATUSES.includes(r.status as Status)) {
    throw new Error(`Corrupt status in DB: ${r.status}`);
  }
  return {
    id: r.id,
    code: r.code,
    category: r.category as Category,
    title: r.title,
    description: r.description,
    status: r.status as Status,
    walletAddress: r.wallet_address,
    contactHandle: r.contact_handle,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function createTicket(input: NewTicket): Ticket {
  const db = getDb();
  const now = Date.now();
  // Two-step insert so the public code can be derived from the row id.
  // The transaction guarantees we never observe a row without a code.
  const tx = db.transaction((data: NewTicket): Ticket => {
    const result = db
      .prepare(
        `INSERT INTO tickets (
          code, category, title, description, status,
          wallet_address, contact_handle, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?)`,
      )
      .run(
        'PENDING',
        data.category,
        data.title,
        data.description,
        data.walletAddress ?? null,
        data.contactHandle ?? null,
        now,
        now,
      );
    const id = Number(result.lastInsertRowid);
    const code = makeCode(id);
    db.prepare('UPDATE tickets SET code = ? WHERE id = ?').run(code, id);
    const row = db
      .prepare('SELECT * FROM tickets WHERE id = ?')
      .get(id) as Row;
    return fromRow(row);
  });
  return tx(input);
}

export function getTicketByCode(code: string): Ticket | null {
  const row = getDb()
    .prepare('SELECT * FROM tickets WHERE code = ?')
    .get(code) as Row | undefined;
  return row ? fromRow(row) : null;
}

export function listTicketsForWallet(wallet: string, limit = 50): Ticket[] {
  const rows = getDb()
    .prepare(
      'SELECT * FROM tickets WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ?',
    )
    .all(wallet, limit) as Row[];
  return rows.map(fromRow);
}

export function setTicketStatus(code: string, status: Status): Ticket | null {
  const db = getDb();
  const now = Date.now();
  db.prepare(
    'UPDATE tickets SET status = ?, updated_at = ? WHERE code = ?',
  ).run(status, now, code);
  return getTicketByCode(code);
}
