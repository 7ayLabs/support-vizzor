export const CATEGORIES = [
  'bug',
  'feature',
  'improvement',
  'question',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = [
  'open',
  'triaging',
  'in_progress',
  'resolved',
  'closed',
] as const;
export type Status = (typeof STATUSES)[number];

export interface Ticket {
  id: number;
  code: string; // public-safe short code, e.g. VZS-7K2M
  category: Category;
  title: string;
  description: string;
  status: Status;
  walletAddress: string | null;
  contactHandle: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface NewTicket {
  category: Category;
  title: string;
  description: string;
  contactHandle?: string;
  walletAddress?: string | null;
}
