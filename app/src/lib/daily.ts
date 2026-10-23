/**
 * The verse the start screen opens on.
 *
 * It has to be the same verse all day, the same verse on every device, and arrive
 * without asking anyone anything — so it is a function of the date, not a random draw.
 * Walking the list by day of the year also means the year reads Genesis to Revelation,
 * since the list is kept in reading order.
 *
 * The list itself is generated, not curated; `daily.generated.ts` says how it was
 * chosen and why nobody picked it by hand.
 */

import { DAILY_VERSES } from './daily.generated';
import type { DailyVerse } from './daily.generated';
import { startOf, today } from './dates';

export type { DailyVerse };

/**
 * Which day of the year a date falls on, 1 to 366, in the reader's own time zone.
 *
 * Counted from local midnights rather than by subtracting timestamps, so the day a
 * clock change falls in is still one day.
 */
export function dayOfYear(iso: string): number {
  const date = startOf(iso);
  const january = new Date(date.getFullYear(), 0, 1);
  return (
    Math.round(
      (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
        january.getTime()) /
        86_400_000,
    ) + 1
  );
}

/**
 * The verse for a given day.
 *
 * Wrapped by the length of the list so a shorter list still covers the year, and a
 * common year's 365 days still never repeat.
 */
export function verseForDate(iso: string = today(), verses = DAILY_VERSES): DailyVerse | null {
  if (verses.length === 0) return null;
  return verses[(dayOfYear(iso) - 1) % verses.length];
}

/** How many days until this verse comes round again, for the line under it. */
export function daysUntilRepeat(verses = DAILY_VERSES): number {
  return verses.length;
}
