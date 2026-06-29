'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, type Category } from '@/lib/tickets/types';
import { LIMITS } from '@/lib/tickets/sanitize';

interface Props {
  initialCategory?: Category;
}

const CATEGORY_LABELS: Record<Category, string> = {
  bug: 'Bug',
  feature: 'Feature request',
  improvement: 'Improvement',
  question: 'Question',
  other: 'Other',
};

export function TicketForm({ initialCategory = 'bug' }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState<Category>(initialCategory);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category,
          title,
          description,
          contactHandle: contact || undefined,
        }),
      });
      const data = (await res.json()) as
        | { ok: true; ticket: { code: string } }
        | { ok: false; error: string; detail?: string };
      if (!res.ok || !data.ok) {
        const msg =
          ('error' in data && data.error === 'rate_limited'
            ? 'You\'ve filed too many tickets in a short window. Try again in a bit.'
            : ('detail' in data && data.detail) || 'Could not file this ticket. Try again.');
        setError(msg);
        return;
      }
      router.push(`/tickets/${data.ticket.code}`);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label htmlFor="category" className="text-sm font-medium">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Title <span className="text-[var(--color-fg-subtle)]">({title.length}/{LIMITS.title.max})</span>
        </label>
        <input
          id="title"
          required
          minLength={LIMITS.title.min}
          maxLength={LIMITS.title.max}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short summary"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description <span className="text-[var(--color-fg-subtle)]">({description.length}/{LIMITS.description.max})</span>
        </label>
        <textarea
          id="description"
          required
          minLength={LIMITS.description.min}
          maxLength={LIMITS.description.max}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={10}
          placeholder="What happened? What did you expect to happen?"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="contact" className="text-sm font-medium">
          Contact (optional)
        </label>
        <input
          id="contact"
          maxLength={LIMITS.contactHandle.max}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="email, telegram handle, anything"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2"
        />
        <p className="text-xs text-[var(--color-fg-subtle)]">
          We&rsquo;ll only use this to reply about this ticket.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-fg)] px-4 py-2 font-medium disabled:opacity-50"
      >
        {busy ? 'Sending…' : 'File ticket'}
      </button>
    </form>
  );
}
