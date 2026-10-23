import { describe, expect, it } from 'vitest';
import { streakOf, chapterKey } from './progress';
import { addDays, today } from './dates';

describe('the streak', () => {
  it('is nothing before anything is read', () => {
    expect(streakOf([])).toBe(0);
  });

  it('counts today', () => {
    expect(streakOf([today()])).toBe(1);
  });

  it('survives the morning before that day is read', () => {
    // A streak that reset at midnight would read 0 every morning, which is both wrong
    // and discouraging.
    expect(streakOf([addDays(today(), -1)])).toBe(1);
    expect(streakOf([addDays(today(), -2), addDays(today(), -1)])).toBe(2);
  });

  it('breaks after a missed day', () => {
    expect(streakOf([addDays(today(), -2)])).toBe(0);
    expect(streakOf([addDays(today(), -5), addDays(today(), -4)])).toBe(0);
  });

  it('counts only the run ending now, not the best run ever', () => {
    const days = [
      addDays(today(), -20),
      addDays(today(), -19),
      addDays(today(), -18),
      addDays(today(), -17),
      addDays(today(), -1),
      today(),
    ];
    expect(streakOf(days)).toBe(2);
  });

  it('ignores order and repeats', () => {
    expect(streakOf([today(), addDays(today(), -1), today()])).toBe(2);
    expect(streakOf([addDays(today(), -1), today()])).toBe(2);
  });

  it('counts a long run', () => {
    const days = Array.from({ length: 40 }, (_, i) => addDays(today(), -i));
    expect(streakOf(days)).toBe(40);
  });
});

describe('chapter keys', () => {
  it('keeps books apart', () => {
    // Keying by chapter alone once meant marking Genesis 3 also marked John 3.
    expect(chapterKey(1, 3)).not.toBe(chapterKey(43, 3));
    expect(chapterKey(1, 3)).toBe('1:3');
  });
});
