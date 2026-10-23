/**
 * The reading plan, as actual days.
 *
 * `plan.ts` answers "how much a day?"; this answers "what do I read today?". The
 * difference matters: a figure like 3.3 chapters a day cannot be read, and a plan that
 * only states a rate leaves the reader to work out where they are every morning.
 *
 * Days are assigned by words rather than by chapters. Chapters are wildly uneven —
 * Psalm 117 is 33 words and Psalm 119 is 2,423, a 73-fold difference — so an even
 * number of chapters is a wildly uneven amount of reading. Whole chapters are kept
 * intact, because nobody reads half a chapter.
 *
 * Today's reading is taken from the first chapter not yet read rather than from the
 * calendar. That is deliberate: a reader who misses a week should come back to where
 * they are, not to where the schedule says they ought to be. Falling behind is reported
 * separately, as something to know rather than something to trip over.
 */

import type { Book } from './bible';
import { addDays, daysBetween, isoDate, startOf, today } from './dates';

export { addDays, daysBetween, isoDate };

export type PlanSettings = {
  /** When the plan began, as YYYY-MM-DD. */
  startedOn: string;
  /** A deadline in days, or an amount of time per day. */
  mode: 'days' | 'minutes';
  value: number;
  wordsPerMinute: number;
};

export const PLAN_DEFAULTS: PlanSettings = {
  startedOn: today(),
  mode: 'days',
  value: 365,
  wordsPerMinute: 200,
};

/** One chapter, with enough to schedule it and to open it. */
export type Chapter = {
  bookId: number;
  book: string;
  abbreviation: string;
  chapter: number;
  words: number;
};

export type Day = {
  /** 1 for the first day of the plan. */
  index: number;
  date: string;
  chapters: Chapter[];
  words: number;
  minutes: number;
};

/** Every chapter in canonical order, Genesis 1 to Revelation 22. */
export function chaptersOf(books: Book[]): Chapter[] {
  const out: Chapter[] = [];
  for (const book of books) {
    for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
      out.push({
        bookId: book.id,
        book: book.name,
        abbreviation: book.abbreviation,
        chapter,
        // A book built before chapter words existed falls back to an even share, so an
        // old cached index still schedules rather than producing days of nothing.
        words: book.chapterWords?.[chapter - 1] ?? Math.round(book.words / book.chapters),
      });
    }
  }
  return out;
}

export function keyOf(chapter: Pick<Chapter, 'bookId' | 'chapter'>): string {
  return `${chapter.bookId}:${chapter.chapter}`;
}

/**
 * How many days the plan runs for, and how much reading each day holds.
 *
 * In `days` mode the deadline sets the daily amount; in `minutes` mode the daily amount
 * sets the deadline.
 */
export function shapeOf(settings: PlanSettings, totalWords: number) {
  const wpm = Math.max(50, settings.wordsPerMinute);
  const value = Math.max(1, settings.value);

  const days = settings.mode === 'days' ? Math.round(value) : Math.ceil(totalWords / wpm / value);
  const wordsPerDay = totalWords / Math.max(1, days);

  return { days: Math.max(1, days), wordsPerDay, minutesPerDay: wordsPerDay / wpm, wpm };
}

/**
 * The whole plan, day by day.
 *
 * Each day is filled towards a running total — day 3 of 100 aims at 3% of the Bible,
 * not at three days' worth added up — so rounding at one boundary cannot accumulate
 * into a plan that ends weeks off. The last day therefore always ends at Revelation 22.
 */
export function buildDays(chapters: Chapter[], settings: PlanSettings): Day[] {
  const totalWords = chapters.reduce((sum, chapter) => sum + chapter.words, 0);
  const { days, wpm } = shapeOf(settings, totalWords);

  const out: Day[] = [];
  let index = 0;
  let cumulative = 0;

  for (let day = 1; day <= days && index < chapters.length; day += 1) {
    const target = (totalWords * day) / days;
    const assigned: Chapter[] = [];
    let words = 0;

    while (index < chapters.length) {
      const next = chapters[index];
      const after = cumulative + next.words;
      // Take another chapter only while taking one lands closer to the day's running
      // total than stopping here would. Every day gets at least one chapter.
      if (assigned.length > 0 && Math.abs(target - cumulative) <= Math.abs(after - target)) break;

      assigned.push(next);
      words += next.words;
      cumulative = after;
      index += 1;
    }

    out.push({
      index: day,
      date: addDays(settings.startedOn, day - 1),
      chapters: assigned,
      words,
      minutes: words / wpm,
    });
  }

  return out;
}

/**
 * What to read now: the next unread chapters, about one day's worth.
 *
 * `extra` multiplies the amount, which is how catching up works — asking for two days'
 * worth gives the chapters for two days.
 */
export function nextReading(
  chapters: Chapter[],
  isRead: (chapter: Chapter) => boolean,
  wordsPerDay: number,
  extra = 1,
): Chapter[] {
  const target = Math.max(1, wordsPerDay * extra);
  const out: Chapter[] = [];
  let words = 0;

  for (const chapter of chapters) {
    if (isRead(chapter)) continue;
    const after = words + chapter.words;
    if (out.length > 0 && Math.abs(target - words) <= Math.abs(after - target)) break;
    out.push(chapter);
    words = after;
  }

  return out;
}

export type Standing = {
  /** Words read, of the whole Bible. */
  wordsRead: number;
  totalWords: number;
  chaptersRead: number;
  totalChapters: number;
  /** 0 to 1. */
  fraction: number;
  /** Days of the plan elapsed, 1 on the first day. */
  dayIndex: number;
  planDays: number;
  /** Where the plan expected to be by now, in words. */
  expectedWords: number;
  /** Positive means behind, negative means ahead. */
  daysBehind: number;
  /** Where the current pace lands, given what has actually been read. */
  finishesOn: string | null;
  /** True once every chapter is read. */
  finished: boolean;
};

export function standing(
  chapters: Chapter[],
  isRead: (chapter: Chapter) => boolean,
  settings: PlanSettings,
  at = today(),
): Standing {
  const totalWords = chapters.reduce((sum, chapter) => sum + chapter.words, 0);
  const { days, wordsPerDay } = shapeOf(settings, totalWords);

  let wordsRead = 0;
  let chaptersRead = 0;
  for (const chapter of chapters) {
    if (!isRead(chapter)) continue;
    wordsRead += chapter.words;
    chaptersRead += 1;
  }

  const elapsed = Math.max(0, daysBetween(settings.startedOn, at));
  const dayIndex = Math.min(days, elapsed + 1);
  const expectedWords = Math.min(totalWords, (totalWords * dayIndex) / days);
  const daysBehind = (expectedWords - wordsRead) / Math.max(1, wordsPerDay);

  // The finish date comes from the pace actually achieved, not the pace intended, so a
  // reader who is behind sees where they are really heading.
  let finishesOn: string | null = null;
  const remaining = totalWords - wordsRead;
  if (remaining <= 0) {
    finishesOn = at;
  } else if (wordsRead > 0 && elapsed > 0) {
    const achieved = wordsRead / elapsed;
    finishesOn = addDays(at, Math.ceil(remaining / Math.max(1, achieved)));
  }

  return {
    wordsRead,
    totalWords,
    chaptersRead,
    totalChapters: chapters.length,
    fraction: totalWords === 0 ? 0 : wordsRead / totalWords,
    dayIndex,
    planDays: days,
    expectedWords,
    daysBehind,
    finishesOn,
    finished: chaptersRead === chapters.length && chapters.length > 0,
  };
}

/** A run of chapters as a reader would say it: "Genesis 1–3", "Mark 16 – Luke 2". */
export function describeRun(chapters: Chapter[]): string {
  if (chapters.length === 0) return 'Nothing left';
  const first = chapters[0];
  const last = chapters[chapters.length - 1];
  if (chapters.length === 1) return `${first.book} ${first.chapter}`;
  if (first.bookId === last.bookId) return `${first.book} ${first.chapter}–${last.chapter}`;
  return `${first.book} ${first.chapter} – ${last.book} ${last.chapter}`;
}

/** A date as a reader would read it, without the year when it is this year. */
export function readableDate(iso: string, at = today()): string {
  const date = startOf(iso);
  const sameYear = iso.slice(0, 4) === at.slice(0, 4);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
