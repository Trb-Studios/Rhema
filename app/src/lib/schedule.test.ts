import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Book } from './bible';
import {
  buildDays,
  chaptersOf,
  describeRun,
  keyOf,
  nextReading,
  readableDate,
  shapeOf,
  standing,
} from './schedule';
import type { Chapter, PlanSettings } from './schedule';

/**
 * The real text, not a fixture. The whole argument for scheduling by words rests on how
 * uneven the actual chapters are, so a fixture of tidy equal chapters would test the
 * opposite of what matters.
 */
const books = JSON.parse(
  readFileSync(new URL('../../public/bible/index.json', import.meta.url), 'utf8'),
) as Book[];

const chapters = chaptersOf(books);
const totalWords = chapters.reduce((sum, chapter) => sum + chapter.words, 0);

function settings(over: Partial<PlanSettings> = {}): PlanSettings {
  return { startedOn: '2026-01-01', mode: 'days', value: 365, wordsPerMinute: 200, ...over };
}

describe('the text it schedules', () => {
  it('is the whole Bible', () => {
    expect(books).toHaveLength(66);
    expect(chapters).toHaveLength(1189);
    expect(chapters[0]).toMatchObject({ book: 'Genesis', chapter: 1 });
    expect(chapters[chapters.length - 1]).toMatchObject({ book: 'Revelation', chapter: 22 });
  });

  it('has chapters so uneven that counting them would mislead', () => {
    const psalms = chapters.filter((chapter) => chapter.book === 'Psalms');
    const shortest = psalms.find((chapter) => chapter.chapter === 117)!;
    const longest = psalms.find((chapter) => chapter.chapter === 119)!;
    expect(longest.words / shortest.words).toBeGreaterThan(50);
  });

  it('counts every word of every chapter', () => {
    expect(totalWords).toBe(books.reduce((sum, book) => sum + book.words, 0));
    expect(chapters.every((chapter) => chapter.words > 0)).toBe(true);
  });
});

describe('building the days', () => {
  const days = buildDays(chapters, settings());

  it('runs for the number of days asked for', () => {
    expect(days).toHaveLength(365);
    expect(days[0].date).toBe('2026-01-01');
    expect(days[364].date).toBe('2026-12-31');
  });

  it('reads the Bible exactly once, in order', () => {
    const flat = days.flatMap((day) => day.chapters);
    expect(flat).toHaveLength(chapters.length);
    expect(flat.map(keyOf)).toEqual(chapters.map(keyOf));
    expect(new Set(flat.map(keyOf)).size).toBe(chapters.length);
  });

  it('begins at Genesis 1 and ends at Revelation 22', () => {
    expect(describeRun(days[0].chapters).startsWith('Genesis 1')).toBe(true);
    const last = days[364].chapters;
    expect(last[last.length - 1]).toMatchObject({ book: 'Revelation', chapter: 22 });
  });

  it('gives every day something to read', () => {
    expect(days.every((day) => day.chapters.length > 0)).toBe(true);
  });

  it('keeps the daily amount even', () => {
    const target = totalWords / 365;
    const worst = Math.max(...days.map((day) => Math.abs(day.words - target) / target));
    // No day is more than two-thirds off the average, even though single chapters
    // range from 33 to 2,423 words.
    expect(worst).toBeLessThan(0.7);

    const typical = days.map((day) => Math.abs(day.words - target) / target).sort((a, b) => a - b)[
      Math.floor(days.length / 2)
    ];
    expect(typical).toBeLessThan(0.2);
  });

  it('does not drift: no day ends far from where the plan expects', () => {
    let cumulative = 0;
    let worst = 0;
    for (const day of days) {
      cumulative += day.words;
      const expected = (totalWords * day.index) / 365;
      worst = Math.max(worst, Math.abs(cumulative - expected));
    }
    // Less than a day's reading of accumulated error across a whole year.
    expect(worst).toBeLessThan(totalWords / 365);
  });

  it('never splits a chapter', () => {
    const flat = days.flatMap((day) => day.chapters);
    for (const chapter of flat) {
      const source = chapters.find((item) => keyOf(item) === keyOf(chapter))!;
      expect(chapter.words).toBe(source.words);
    }
  });

  it('keeps a day contiguous', () => {
    const order = new Map(chapters.map((chapter, index) => [keyOf(chapter), index]));
    for (const day of days) {
      for (let i = 1; i < day.chapters.length; i += 1) {
        expect(order.get(keyOf(day.chapters[i]))).toBe(order.get(keyOf(day.chapters[i - 1]))! + 1);
      }
    }
  });

  it('works at both extremes of pace', () => {
    for (const value of [1, 7, 30, 90, 365, 1189, 2000]) {
      const built = buildDays(chapters, settings({ value }));
      const flat = built.flatMap((day) => day.chapters);
      expect(flat).toHaveLength(chapters.length);
      expect(built.length).toBeLessThanOrEqual(value);
      // More days than chapters cannot mean empty days.
      expect(built.every((day) => day.chapters.length > 0)).toBe(true);
    }
  });

  it('reads it all in one day when asked to', () => {
    const built = buildDays(chapters, settings({ value: 1 }));
    expect(built).toHaveLength(1);
    expect(built[0].chapters).toHaveLength(1189);
  });
});

describe('pace', () => {
  it('turns a deadline into a daily amount', () => {
    const shape = shapeOf(settings({ mode: 'days', value: 365 }), totalWords);
    expect(shape.days).toBe(365);
    expect(Math.round(shape.minutesPerDay)).toBe(Math.round(totalWords / 200 / 365));
  });

  it('turns a daily amount into a deadline', () => {
    const shape = shapeOf(settings({ mode: 'minutes', value: 15 }), totalWords);
    // 789,634 words at 200 a minute is about 66 hours, so a quarter of an hour a day
    // is a little over nine months.
    expect(shape.days).toBeGreaterThan(240);
    expect(shape.days).toBeLessThan(290);
    expect(Math.round(shape.minutesPerDay)).toBe(15);
  });

  it('refuses nonsense without crashing', () => {
    expect(shapeOf(settings({ value: 0 }), totalWords).days).toBeGreaterThan(0);
    expect(shapeOf(settings({ value: -5 }), totalWords).days).toBeGreaterThan(0);
    expect(shapeOf(settings({ wordsPerMinute: 0 }), totalWords).wpm).toBe(50);
  });
});

describe('what to read next', () => {
  const perDay = totalWords / 365;

  it('starts at Genesis 1 when nothing is read', () => {
    const next = nextReading(chapters, () => false, perDay);
    expect(next[0]).toMatchObject({ book: 'Genesis', chapter: 1 });
    expect(describeRun(next)).toMatch(/^Genesis 1/);
  });

  it('picks up after what has been read, not where the calendar says', () => {
    const read = new Set(chapters.slice(0, 40).map(keyOf));
    const next = nextReading(chapters, (chapter) => read.has(keyOf(chapter)), perDay);
    expect(next[0]).toMatchObject({ bookId: chapters[40].bookId, chapter: chapters[40].chapter });
  });

  it('skips over chapters read out of order', () => {
    const read = new Set([keyOf(chapters[0]), keyOf(chapters[2])]);
    const next = nextReading(chapters, (chapter) => read.has(keyOf(chapter)), perDay);
    expect(next.map(keyOf)).not.toContain(keyOf(chapters[0]));
    expect(next.map(keyOf)).not.toContain(keyOf(chapters[2]));
    expect(next[0].chapter).toBe(2);
  });

  it('gives more when catching up', () => {
    const one = nextReading(chapters, () => false, perDay, 1);
    const three = nextReading(chapters, () => false, perDay, 3);
    const oneWords = one.reduce((sum, chapter) => sum + chapter.words, 0);
    const threeWords = three.reduce((sum, chapter) => sum + chapter.words, 0);
    expect(threeWords).toBeGreaterThan(oneWords * 2);
    expect(three.length).toBeGreaterThan(one.length);
  });

  it('gives nothing once the Bible is read', () => {
    expect(nextReading(chapters, () => true, perDay)).toEqual([]);
    expect(describeRun([])).toBe('Nothing left');
  });

  it('always gives at least one chapter, however small the target', () => {
    expect(nextReading(chapters, () => false, 1)).toHaveLength(1);
  });
});

describe('where the reader stands', () => {
  const none = () => false;

  it('is at the start on day one', () => {
    const where = standing(chapters, none, settings(), '2026-01-01');
    expect(where.dayIndex).toBe(1);
    expect(where.chaptersRead).toBe(0);
    expect(where.fraction).toBe(0);
    expect(where.finished).toBe(false);
  });

  it('counts being behind in days of reading', () => {
    // A month in, nothing read: about a month behind.
    const where = standing(chapters, none, settings(), '2026-01-31');
    expect(Math.round(where.daysBehind)).toBe(31);
  });

  it('counts being ahead as a negative', () => {
    const read = new Set(chapters.slice(0, 200).map(keyOf));
    const where = standing(
      chapters,
      (chapter) => read.has(keyOf(chapter)),
      settings(),
      '2026-01-10',
    );
    expect(where.daysBehind).toBeLessThan(0);
  });

  it('measures progress by words, not by chapters', () => {
    // The first 150 chapters of Psalms are a far smaller share of the Bible than the
    // first 150 of Genesis through Joshua.
    const psalms = new Set(chapters.filter((chapter) => chapter.book === 'Psalms').map(keyOf));
    const where = standing(chapters, (chapter) => psalms.has(keyOf(chapter)), settings());
    expect(where.chaptersRead).toBe(150);
    expect(where.fraction).toBeLessThan(150 / 1189);
  });

  it('projects the finish from the pace actually achieved', () => {
    // Ten days in with a tenth of the way done lands on the plan's own length.
    const tenth = Math.round(chapters.length * 0.1);
    const read = new Set(chapters.slice(0, tenth).map(keyOf));
    const where = standing(
      chapters,
      (chapter) => read.has(keyOf(chapter)),
      settings({ value: 100 }),
      '2026-01-11',
    );
    expect(where.finishesOn).not.toBe(null);
    expect(where.finishesOn!.slice(0, 4)).toBe('2026');
  });

  it('has no projection before anything is read', () => {
    expect(standing(chapters, none, settings(), '2026-01-05').finishesOn).toBe(null);
  });

  it('knows when it is done', () => {
    const where = standing(chapters, () => true, settings(), '2026-06-01');
    expect(where.finished).toBe(true);
    expect(where.fraction).toBe(1);
    expect(where.finishesOn).toBe('2026-06-01');
  });

  it('does not run past the end of the plan', () => {
    const where = standing(chapters, none, settings(), '2030-01-01');
    expect(where.dayIndex).toBe(365);
    expect(where.expectedWords).toBe(totalWords);
  });
});

describe('saying it in words', () => {
  function chapter(book: string, number: number, bookId = 1): Chapter {
    return { bookId, book, abbreviation: book.slice(0, 3), chapter: number, words: 100 };
  }

  it('names a single chapter', () => {
    expect(describeRun([chapter('Genesis', 1)])).toBe('Genesis 1');
  });

  it('names a run inside one book', () => {
    expect(describeRun([chapter('Genesis', 1), chapter('Genesis', 3)])).toBe('Genesis 1–3');
  });

  it('names a run across books', () => {
    expect(describeRun([chapter('Mark', 16, 41), chapter('Luke', 2, 42)])).toBe('Mark 16 – Luke 2');
  });

  it('leaves the year off dates in this year', () => {
    expect(readableDate('2026-03-04', '2026-01-01')).not.toMatch(/2026/);
    expect(readableDate('2027-03-04', '2026-01-01')).toMatch(/2027/);
  });
});
