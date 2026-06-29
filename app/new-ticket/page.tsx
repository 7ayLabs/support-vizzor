import { TicketForm } from '@/components/ticket-form';
import { CATEGORIES, type Category } from '@/lib/tickets/types';

interface Props {
  searchParams: Promise<{ category?: string }>;
}

function isCategory(v: string | undefined): v is Category {
  return !!v && (CATEGORIES as readonly string[]).includes(v);
}

export default async function NewTicketPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const initial: Category = isCategory(category) ? category : 'bug';

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">New ticket</h1>
        <p className="text-[var(--color-fg-muted)]">
          The more context you share, the faster we can help.
        </p>
      </header>
      <TicketForm initialCategory={initial} />
    </div>
  );
}
