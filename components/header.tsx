import Link from 'next/link';
import { AuthBadge } from './auth-badge';

export function Header() {
  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-3xl px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="size-2 rounded-full bg-[var(--color-accent)] group-hover:scale-125 transition-transform" />
          <span className="font-medium tracking-tight">
            Vizzor <span className="text-[var(--color-fg-muted)]">Support</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/new-ticket"
            className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            New ticket
          </Link>
          <Link
            href="/my-tickets"
            className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            My tickets
          </Link>
          <AuthBadge />
        </nav>
      </div>
    </header>
  );
}
