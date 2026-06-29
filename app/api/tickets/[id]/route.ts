import { NextResponse } from 'next/server';
import { getTicketByCode } from '@/lib/tickets/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const ticket = getTicketByCode(id);
  if (!ticket) {
    return NextResponse.json(
      { ok: false, error: 'not_found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return NextResponse.json(
    {
      ok: true,
      ticket: {
        code: ticket.code,
        category: ticket.category,
        status: ticket.status,
        title: ticket.title,
        description: ticket.description,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
