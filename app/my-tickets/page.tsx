import Link from 'next/link';
import { readIdentity } from '@/lib/auth/identity';
import { listTicketsForWallet } from '@/lib/tickets/repo';

export const dynamic = 'force-dynamic';

export default async function MyTicketsPage() {
  const identity = await readIdentity();
  if (!identity) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">My tickets</h1>
        <p className="text-[var(--color-fg-muted)]">
          Sign in via vizzor.ai to see tickets filed under your wallet, or look
          up a single ticket by its short code (e.g.{' '}
          <code className="font-mono">VZS-7K2M</code>) at{' '}
          <code className="font-mono">/tickets/VZS-7K2M</code>.
        </p>
      </div>
    );
  }

  const tickets = listTicketsForWallet(identity.wallet);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">My tickets</h1>
        <p className="text-xs text-[var(--color-fg-subtle)] font-mono">
          {identity.wallet}
        </p>
      </header>

      {tickets.length === 0 ? (
        <p className="text-[var(--color-fg-muted)]">
          No tickets yet.{' '}
          <Link
            href="/new-ticket"
            className="text-[var(--color-accent)] hover:underline"
          >
            File one →
          </Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {tickets.map((t) => (
            <li key={t.code}>
              <Link
                href={`/tickets/${t.code}`}
                className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4 hover:border-[var(--color-accent)]"
              >
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-xs text-[var(--color-fg-muted)]">
                    {t.code}
                  </span>
                  <span className="text-xs text-[var(--color-fg-subtle)] capitalize">
                    {t.category}
                  </span>
                  <span className="text-xs text-[var(--color-fg-subtle)] capitalize">
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="font-medium">{t.title}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
