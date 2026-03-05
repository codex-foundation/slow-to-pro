/** Returns today's date as 'YYYY-MM-DD' */
export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns the current month as 'YYYY-MM' */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Returns the day of week (0=Sun..6=Sat) for today */
export function todayWeekday(): number {
  return new Date().getDay();
}

/** Format a Unix ms timestamp as 'HH:MM' */
export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Format a Unix ms timestamp as 'MMM D' */
export function formatShortDate(ms: number): string {
  return new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric' });
}
