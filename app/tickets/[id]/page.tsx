import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTicketByCode } from '@/lib/tickets/repo';
import type { Status } from '@/lib/tickets/types';

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<Status, string> = {
  open: 'Open',
  triaging: 'Triaging',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_COLORS: Record<Status, string> = {
  open: 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]',
  triaging: 'bg-[var(--color-warn)]/20 text-[var(--color-warn)]',
  in_progress: 'bg-[var(--color-warn)]/20 text-[var(--color-warn)]',
  resolved: 'bg-[var(--color-ok)]/20 text-[var(--color-ok)]',
  closed: 'bg-[var(--color-fg-subtle)]/20 text-[var(--color-fg-subtle)]',
};

export default async function TicketPage({ params }: Props) {
  const { id } = await params;
  const ticket = getTicketByCode(id);
  if (!ticket) notFound();

  const created = new Date(ticket.createdAt).toLocaleString();

  return (
    <article className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-[var(--color-fg-muted)]">
            {ticket.code}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[ticket.status]}`}
          >
            {STATUS_LABELS[ticket.status]}
          </span>
          <span className="text-xs text-[var(--color-fg-subtle)] capitalize">
            {ticket.category}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {ticket.title}
        </h1>
        <div className="text-xs text-[var(--color-fg-subtle)]">
          Filed {created}
        </div>
      </header>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5 whitespace-pre-wrap text-sm leading-relaxed">
        {ticket.description}
      </section>

      <footer>
        <Link
          href="/new-ticket"
          className="text-sm text-[var(--color-accent)] hover:underline"
        >
          File another →
        </Link>
      </footer>
    </article>
  );
}
