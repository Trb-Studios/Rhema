/**
 * What has been read, and when.
 *
 * Kept on this device for now; it moves to the person's account once sign-in lands.
 * Chapters are recorded as `bookId:chapter`, so the record survives renaming anything
 * in the interface.
 */

import { useCallback, useEffect, useState } from 'react';

export type Progress = {
  /** Every chapter marked read. */
  read: string[];
  /** Dates, as YYYY-MM-DD, on which something was read. Drives the streak. */
  days: string[];
  /** Where to pick up again. */
  last: { bookId: number; chapter: number } | null;
};

const EMPTY: Progress = { read: [], days: [], last: null };
const KEY = 'rhema.progress';

export function chapterKey(bookId: number, chapter: number) {
  return `${bookId}:${chapter}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function load(): Progress {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? { ...EMPTY, ...(JSON.parse(saved) as Partial<Progress>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/**
 * Consecutive days ending today or yesterday. Yesterday still counts, so the streak
 * does not look broken first thing in the morning before that day's reading.
 */
export function streakOf(days: string[]): number {
  if (days.length === 0) return 0;

  const seen = new Set(days);
  const day = new Date();

  if (!seen.has(day.toISOString().slice(0, 10))) {
    day.setDate(day.getDate() - 1);
    if (!seen.has(day.toISOString().slice(0, 10))) return 0;
  }

  let count = 0;
  while (seen.has(day.toISOString().slice(0, 10))) {
    count += 1;
    day.setDate(day.getDate() - 1);
  }
  return count;
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(progress));
    } catch {
      // Losing the record is not worth interrupting a reading session over.
    }
  }, [progress]);

  /** Remember where the reader is, without claiming the chapter has been read. */
  const visit = useCallback((bookId: number, chapter: number) => {
    setProgress((current) => {
      if (current.last?.bookId === bookId && current.last?.chapter === chapter) return current;
      return { ...current, last: { bookId, chapter } };
    });
  }, []);

  /** Mark a chapter read, or unmark it. Reading anything counts towards today. */
  const toggleRead = useCallback((bookId: number, chapter: number) => {
    const key = chapterKey(bookId, chapter);
    setProgress((current) => {
      const had = current.read.includes(key);
      const read = had ? current.read.filter((k) => k !== key) : [...current.read, key];
      const days =
        had || current.days.includes(today()) ? current.days : [...current.days, today()];
      return { ...current, read, days };
    });
  }, []);

  return {
    progress,
    visit,
    toggleRead,
    streak: streakOf(progress.days),
    isRead: (bookId: number, chapter: number) =>
      progress.read.includes(chapterKey(bookId, chapter)),
  };
}
