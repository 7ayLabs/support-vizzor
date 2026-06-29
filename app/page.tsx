import Link from 'next/link';
import { Bug, Lightbulb, Sparkles, MessageCircle } from 'lucide-react';

const CATEGORIES = [
  {
    slug: 'bug',
    title: 'Report a bug',
    description: 'Something is broken or not behaving as documented.',
    Icon: Bug,
  },
  {
    slug: 'feature',
    title: 'Request a feature',
    description: 'Something Vizzor does not do yet that would help you.',
    Icon: Lightbulb,
  },
  {
    slug: 'improvement',
    title: 'Suggest an improvement',
    description: 'Something Vizzor does but could do better.',
    Icon: Sparkles,
  },
  {
    slug: 'question',
    title: 'Ask a question',
    description: 'You need help understanding how something works.',
    Icon: MessageCircle,
  },
] as const;

export default function Home() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">
          How can we help?
        </h1>
        <p className="text-[var(--color-fg-muted)] max-w-xl">
          Report a problem, request a feature, or share an improvement. All
          tickets are read by the team. If you're signed in to vizzor.ai we'll
          link the ticket to your wallet automatically.
        </p>
      </header>

      <ul className="grid sm:grid-cols-2 gap-3">
        {CATEGORIES.map(({ slug, title, description, Icon }) => (
          <li key={slug}>
            <Link
              href={{ pathname: '/new-ticket', query: { category: slug } }}
              className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5 hover:bg-[var(--color-bg-elev-2)] hover:border-[var(--color-accent)] transition-colors"
            >
              <div className="flex items-start gap-3">
                <Icon className="size-5 mt-0.5 text-[var(--color-accent)]" />
                <div className="space-y-1">
                  <div className="font-medium">{title}</div>
                  <p className="text-sm text-[var(--color-fg-muted)]">
                    {description}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5">
        <h2 className="font-medium mb-2">Already opened a ticket?</h2>
        <p className="text-sm text-[var(--color-fg-muted)] mb-3">
          Look it up by its short code (e.g. <code className="font-mono">VZS-7K2M</code>).
        </p>
        <Link
          href="/my-tickets"
          className="inline-block text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          View my tickets →
        </Link>
      </section>
    </div>
  );
}
