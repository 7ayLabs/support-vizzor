/**
 * POST /api/tickets — create a ticket.
 *
 * Anonymous OK. If the requester has a valid __Host-support.auth
 * cookie (SSO completed), the resulting wallet is bound to the ticket
 * server-side regardless of any wallet field the form sent. This
 * prevents users from filing tickets "as" someone else.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readIdentity } from '@/lib/auth/identity';
import { createTicket } from '@/lib/tickets/repo';
import { CATEGORIES } from '@/lib/tickets/types';
import {
  clampString,
  cleanText,
  LIMITS,
  looksLikeWallet,
} from '@/lib/tickets/sanitize';
import { consume } from '@/lib/security/rate-limit';
import { resolveClientIp } from '@/lib/security/client-ip';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BodySchema = z.object({
  category: z.enum(CATEGORIES),
  title: z
    .string()
    .min(LIMITS.title.min)
    .max(LIMITS.title.max),
  description: z
    .string()
    .min(LIMITS.description.min)
    .max(LIMITS.description.max),
  contactHandle: z.string().max(LIMITS.contactHandle.max).optional(),
  walletAddress: z.string().max(LIMITS.walletAddress.max).optional(),
});

async function dispatchTriage(payload: unknown): Promise<void> {
  if (!env.triageWebhookUrl) return;
  try {
    await fetch(env.triageWebhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Webhook is fire-and-forget. The DB is the source of truth, and
    // ops can replay from the audit query if needed.
  }
}

export async function POST(req: Request) {
  const ip = resolveClientIp(req);
  const decision = consume(ip, 'tickets:create');
  if (!decision.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      {
        status: 429,
        headers: {
          'Retry-After': String(decision.retryAfterSeconds),
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  let parsed: z.infer<typeof BodySchema>;
  try {
    const json = (await req.json()) as unknown;
    parsed = BodySchema.parse(json);
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: 'invalid_input',
        detail: (e as Error).message.slice(0, 200),
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const identity = await readIdentity();
  const wallet =
    identity?.wallet ??
    (parsed.walletAddress && looksLikeWallet(parsed.walletAddress)
      ? parsed.walletAddress.trim()
      : null);

  const ticket = createTicket({
    category: parsed.category,
    title: clampString(cleanText(parsed.title), LIMITS.title.max),
    description: clampString(
      cleanText(parsed.description),
      LIMITS.description.max,
    ),
    contactHandle: parsed.contactHandle
      ? clampString(cleanText(parsed.contactHandle), LIMITS.contactHandle.max)
      : undefined,
    walletAddress: wallet,
  });

  // Fire-and-forget; do not await — the user shouldn't see webhook
  // latency on the response path.
  void dispatchTriage({
    code: ticket.code,
    category: ticket.category,
    title: ticket.title,
    walletAddress: ticket.walletAddress,
    createdAt: ticket.createdAt,
  });

  return NextResponse.json(
    {
      ok: true,
      ticket: { code: ticket.code, category: ticket.category, status: ticket.status },
    },
    {
      status: 201,
      headers: {
        'Cache-Control': 'no-store',
        'X-RateLimit-Remaining': String(decision.remaining),
      },
    },
  );
}
