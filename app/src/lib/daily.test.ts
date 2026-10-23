import { describe, expect, it } from 'vitest';
import { DAILY_VERSES } from './daily.generated';
import { dayOfYear, verseForDate } from './daily';

describe('dayOfYear', () => {
  it('counts from one on the first of January', () => {
    expect(dayOfYear('2026-01-01')).toBe(1);
  });

  it('reaches 365 at the end of a common year', () => {
    expect(dayOfYear('2026-12-31')).toBe(365);
  });

  it('reaches 366 at the end of a leap year', () => {
    expect(dayOfYear('2028-12-31')).toBe(366);
  });

  it('counts the extra day in a leap year', () => {
    expect(dayOfYear('2028-03-01')).toBe(61);
    expect(dayOfYear('2026-03-01')).toBe(60);
  });
});

describe('verseForDate', () => {
  it('gives the same verse all day, whenever it is asked', () => {
    expect(verseForDate('2026-06-15')).toEqual(verseForDate('2026-06-15'));
  });

  it('moves on the next day', () => {
    expect(verseForDate('2026-06-15')).not.toEqual(verseForDate('2026-06-16'));
  });

  it('never repeats within a common year', () => {
    const seen = new Set<string>();
    for (let day = 1; day <= 365; day++) {
      const date = new Date(2026, 0, day);
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`;
      seen.add(JSON.stringify(verseForDate(iso)));
    }
    expect(seen.size).toBe(365);
  });

  it('has a verse for the extra day of a leap year', () => {
    expect(verseForDate('2028-12-31')).not.toBeNull();
  });

  it('copes with a list shorter than a year', () => {
    const few = [
      [1, 1, 1],
      [43, 3, 16],
    ] as const;
    expect(verseForDate('2026-01-01', few)).toEqual([1, 1, 1]);
    expect(verseForDate('2026-01-02', few)).toEqual([43, 3, 16]);
    expect(verseForDate('2026-01-03', few)).toEqual([1, 1, 1]);
  });

  it('has nothing to show for an empty list rather than failing', () => {
    expect(verseForDate('2026-01-01', [])).toBeNull();
  });
});

describe('the generated list', () => {
  it('covers a leap year', () => {
    expect(DAILY_VERSES).toHaveLength(366);
  });

  it('holds no verse twice', () => {
    expect(new Set(DAILY_VERSES.map((v) => v.join(':'))).size).toBe(DAILY_VERSES.length);
  });

  it('points only at books that exist', () => {
    for (const [book] of DAILY_VERSES) {
      expect(book).toBeGreaterThanOrEqual(1);
      expect(book).toBeLessThanOrEqual(66);
    }
  });

  it('runs in reading order', () => {
    const keys = DAILY_VERSES.map(([b, c, v]) => b * 1_000_000 + c * 1000 + v);
    expect([...keys].sort((a, b) => a - b)).toEqual(keys);
  });

  it('draws on both testaments', () => {
    const ot = DAILY_VERSES.filter(([book]) => book <= 39).length;
    expect(ot).toBeGreaterThan(50);
    expect(DAILY_VERSES.length - ot).toBeGreaterThan(50);
  });
});
