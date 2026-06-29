import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/header';

const ORIGIN =
  process.env.NEXT_PUBLIC_SUPPORT_ORIGIN ?? 'https://support.vizzor.ai';

export const metadata: Metadata = {
  metadataBase: new URL(ORIGIN),
  title: {
    default: 'Vizzor Support',
    template: '%s · Vizzor Support',
  },
  description:
    'File a ticket, request a feature, or report an issue with Vizzor.',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'Vizzor Support',
    url: ORIGIN,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh flex flex-col">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-10">
          {children}
        </main>
        <footer className="border-t border-[var(--color-border)] py-6 text-center text-sm text-[var(--color-fg-subtle)]">
          support.vizzor.ai · v0.0.1
        </footer>
      </body>
    </html>
  );
}
