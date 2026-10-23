/**
 * Dates, as a reader experiences them.
 *
 * Everything dated in this app — the streak, when a verse is next due, which day of the
 * plan it is — is a calendar day in the reader's own place, not an instant. So a day is
 * carried as YYYY-MM-DD and compared as a string.
 *
 * The obvious `new Date().toISOString().slice(0, 10)` is wrong for this: it gives the
 * date in UTC. For a reader in Los Angeles that rolls over at four in the afternoon, so
 * an evening's reading would be credited to tomorrow, a streak would break while it was
 * still being kept, and the plan would advance a day early. These read the local
 * calendar instead.
 */

export function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function today(): string {
  return isoDate(new Date());
}

/** Midnight at the start of that day, in the reader's own time zone. */
export function startOf(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function addDays(iso: string, days: number): string {
  const date = startOf(iso);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

/**
 * Whole days from one date to another; negative if the second is earlier.
 *
 * Rounded, because a day that crosses a clock change is 23 or 25 hours long and should
 * still count as one day.
 */
export function daysBetween(from: string, to: string): number {
  return Math.round((startOf(to).getTime() - startOf(from).getTime()) / 86_400_000);
}
