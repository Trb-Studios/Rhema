import { describe, expect, it } from 'vitest';
import { isDue, newCard, nextShowing, schedule } from './review';
import type { Card, Grade } from './review';
import { today } from './dates';

function after(grades: Grade[]): Card {
  let card = newCard('1:1:1');
  for (const grade of grades) card = schedule(card, grade);
  return card;
}

describe('spaced review', () => {
  it('shows a new verse the day it is saved', () => {
    const card = newCard('1:1:1');
    expect(card.due).toBe(today());
    expect(isDue(card)).toBe(true);
    expect(card.lastSeen).toBe(null);
  });

  it('lengthens the gap as a verse keeps coming back', () => {
    const intervals = [];
    let card = newCard('1:1:1');
    for (let i = 0; i < 5; i += 1) {
      card = schedule(card, 'good');
      intervals.push(Math.round(card.interval));
    }
    // 1 day, 3 days, then multiplied by how readily it comes back: 7.5, 18.75, 46.9.
    expect(intervals).toEqual([1, 3, 8, 19, 47]);
    // Strictly growing, which is the whole point of spacing.
    for (let i = 1; i < intervals.length; i += 1) {
      expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
    }
  });

  it('sends a forgotten verse back to today and makes it harder', () => {
    const learned = after(['good', 'good', 'good']);
    expect(learned.interval).toBeGreaterThan(1);

    const forgotten = schedule(learned, 'again');
    expect(forgotten.due).toBe(today());
    expect(forgotten.interval).toBe(0);
    expect(forgotten.streak).toBe(0);
    expect(forgotten.lapses).toBe(1);
    expect(forgotten.ease).toBeLessThan(learned.ease);
  });

  it('never lets a verse become harder than the floor', () => {
    const card = after(Array(40).fill('again'));
    expect(card.ease).toBe(1.3);
    expect(card.lapses).toBe(40);
  });

  it('caps the gap at a year', () => {
    const card = after(Array(30).fill('easy'));
    expect(card.interval).toBe(365);
    expect(nextShowing(card, 'easy')).toBe('a year');
  });

  it('counts a streak only while nothing is forgotten', () => {
    expect(after(['good', 'good']).streak).toBe(2);
    expect(after(['good', 'good', 'again']).streak).toBe(0);
    expect(after(['good', 'good', 'again', 'good']).streak).toBe(1);
  });

  it('grades easy further out than good, and hard nearer than good', () => {
    const learned = after(['good', 'good']);
    const hard = schedule(learned, 'hard').interval;
    const good = schedule(learned, 'good').interval;
    const easy = schedule(learned, 'easy').interval;
    expect(hard).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
  });

  it('says when a verse comes back in words a reader uses', () => {
    const fresh = newCard('1:1:1');
    expect(nextShowing(fresh, 'again')).toBe('today');
    expect(nextShowing(fresh, 'good')).toBe('tomorrow');
    expect(nextShowing(fresh, 'easy')).toBe('3 days');
    expect(nextShowing(after(['good', 'good', 'good', 'good']), 'good')).toBe('2 months');
  });

  it('is due on its due date and not before', () => {
    expect(isDue({ ...newCard('x'), due: '2000-01-01' })).toBe(true);
    expect(isDue({ ...newCard('x'), due: '2999-01-01' })).toBe(false);
  });
});
