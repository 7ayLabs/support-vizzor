'use client';

import { useEffect, useState } from 'react';

interface Identity {
  signedIn: boolean;
  wallet?: string;
}

const VIZZOR_ORIGIN =
  process.env.NEXT_PUBLIC_VIZZOR_ORIGIN ?? 'https://vizzor.ai';

function shortWallet(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function AuthBadge() {
  const [me, setMe] = useState<Identity | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { signedIn: false }))
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe({ signedIn: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (me === null) {
    return (
      <span
        className="text-xs text-[var(--color-fg-subtle)]"
        aria-busy="true"
        aria-label="Checking identity"
      >
        …
      </span>
    );
  }

  if (!me.signedIn || !me.wallet) {
    const next =
      typeof window !== 'undefined'
        ? `${window.location.origin}/api/auth/sso/return`
        : '';
    const href = `${VIZZOR_ORIGIN}/auth/sso?return_to=${encodeURIComponent(next)}`;
    return (
      <a
        href={href}
        className="text-xs px-2.5 py-1 rounded-full border border-[var(--color-border)] hover:border-[var(--color-accent)] text-[var(--color-fg-muted)]"
      >
        Sign in
      </a>
    );
  }

  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full border border-[var(--color-border)] font-mono"
      title={me.wallet}
    >
      {shortWallet(me.wallet)}
    </span>
  );
}
