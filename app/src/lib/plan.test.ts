import { describe, expect, it } from 'vitest';
import { calculate, show } from './plan';

const BIBLE = { totalWords: 789_634, totalChapters: 1189, wordsPerMinute: 200 };

describe('the plan calculator', () => {
  it('turns a year into a daily amount', () => {
    const plan = calculate({ mode: 'days', value: 365, ...BIBLE }, new Date(2026, 0, 1));
    expect(Math.round(plan.chaptersPerDay * 10) / 10).toBe(3.3);
    expect(Math.round(plan.minutesPerDay)).toBe(11);
    expect(plan.finishesOn.getFullYear()).toBe(2027);
  });

  it('turns a daily amount into a finish date', () => {
    const plan = calculate({ mode: 'minutes', value: 60, ...BIBLE }, new Date(2026, 0, 1));
    // The whole Bible is about 66 hours of reading, so an hour a day is about 66 days.
    expect(Math.round(plan.days)).toBe(66);
    expect(Math.round(plan.totalHours)).toBe(66);
  });

  it('never claims to finish more than the Bible in a year', () => {
    const plan = calculate({ mode: 'days', value: 30, ...BIBLE });
    expect(plan.chaptersPerYear).toBe(1189);
  });

  it('holds together at nonsense values', () => {
    for (const value of [0, -1, 0.0001]) {
      const plan = calculate({ mode: 'days', value, ...BIBLE });
      expect(Number.isFinite(plan.chaptersPerDay)).toBe(true);
      expect(plan.days).toBeGreaterThan(0);
    }
  });

  it('rounds for reading without inventing precision', () => {
    expect(show(3.333)).toBe('3.3');
    expect(show(3.333, 0)).toBe('3');
    expect(show(1189)).toBe('1,189');
  });
});
