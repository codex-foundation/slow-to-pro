import type { Expense } from '@/models/finance';

/** Returns the previous month as 'YYYY-MM' */
export function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

/** Returns the next month as 'YYYY-MM' */
export function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

/** Formats 'YYYY-MM' as a human-readable label, e.g. 'March 2026' */
export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Returns the unique months represented in the expense list,
 * sorted newest-first, as 'YYYY-MM' strings.
 */
export function availableMonths(expenses: Expense[]): string[] {
  const set = new Set(expenses.map((e) => new Date(e.date).toISOString().slice(0, 7)));
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}
