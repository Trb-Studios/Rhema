/**
 * What has been read, and when.
 *
 * Kept on this device for now; it moves to the person's account once sign-in lands.
 * Chapters are recorded as `bookId:chapter`, so the record survives renaming anything
 * in the interface.
 *
 * This goes through the shared store because the reader, the plan and the menu all read
 * it. Giving each its own copy meant marking a chapter read in one never reached the
 * others.
 */

import { useCallback } from 'react';
import { isoDate, today } from './dates';
import { createStore, useStore } from './store';

export type Progress = {
  /** Every chapter marked read. */
  read: string[];
  /** Dates, as YYYY-MM-DD, on which something was read. Drives the streak. */
  days: string[];
  /** Where to pick up again. */
  last: { bookId: number; chapter: number } | null;
};

const EMPTY: Progress = { read: [], days: [], last: null };

const store = createStore<Progress>('rhema.progress', EMPTY);

export function chapterKey(bookId: number, chapter: number) {
  return `${bookId}:${chapter}`;
}

/**
 * Consecutive days ending today or yesterday. Yesterday still counts, so the streak
 * does not look broken first thing in the morning before that day's reading.
 */
export function streakOf(days: string[]): number {
  if (days.length === 0) return 0;

  const seen = new Set(days);
  const day = new Date();

  if (!seen.has(isoDate(day))) {
    day.setDate(day.getDate() - 1);
    if (!seen.has(isoDate(day))) return 0;
  }

  let count = 0;
  while (seen.has(isoDate(day))) {
    count += 1;
    day.setDate(day.getDate() - 1);
  }
  return count;
}

export function useProgress() {
  const [progress, setProgress] = useStore(store);

  /** Remember where the reader is, without claiming the chapter has been read. */
  const visit = useCallback(
    (bookId: number, chapter: number) => {
      setProgress((current) => {
        if (current.last?.bookId === bookId && current.last?.chapter === chapter) return current;
        return { ...current, last: { bookId, chapter } };
      });
    },
    [setProgress],
  );

  /** Mark a chapter read, or unmark it. Reading anything counts towards today. */
  const toggleRead = useCallback(
    (bookId: number, chapter: number) => {
      const key = chapterKey(bookId, chapter);
      setProgress((current) => {
        const had = current.read.includes(key);
        const read = had ? current.read.filter((k) => k !== key) : [...current.read, key];
        const days =
          had || current.days.includes(today()) ? current.days : [...current.days, today()];
        return { ...current, read, days };
      });
    },
    [setProgress],
  );

  /** Mark a run of chapters read at once, for finishing a day's reading in the plan. */
  const markMany = useCallback(
    (chapters: { bookId: number; chapter: number }[]) => {
      if (chapters.length === 0) return;
      setProgress((current) => {
        const read = new Set(current.read);
        for (const item of chapters) read.add(chapterKey(item.bookId, item.chapter));
        if (read.size === current.read.length) return current;
        const days = current.days.includes(today()) ? current.days : [...current.days, today()];
        return { ...current, read: [...read], days };
      });
    },
    [setProgress],
  );

  const readSet = new Set(progress.read);

  return {
    progress,
    visit,
    toggleRead,
    markMany,
    streak: streakOf(progress.days),
    readCount: readSet.size,
    isRead: (bookId: number, chapter: number) => readSet.has(chapterKey(bookId, chapter)),
  };
}
