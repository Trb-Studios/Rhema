import { describe, expect, it } from 'vitest';
import type { Question } from './quizbank';
import { bankFor, buildRound, expectedCount, isRight, normalise, pointsFor } from './quizbank';

const q = (overrides: Partial<Question>): Question => ({
  id: 'x',
  bookId: 1,
  l: 1,
  f: 'story',
  q: 'Question?',
  r: 'Gen.1.1',
  ...overrides,
});

describe('typed answers', () => {
  it('forgives spelling slips in longer names', () => {
    expect(isRight('Abarham', 'Abraham')).toBe(true);
    expect(isRight('Melchisedek', 'Melchizedek')).toBe(true);
    expect(isRight('nebucadnezar', 'Nebuchadnezzar')).toBe(true);
  });

  it('does not let one letter turn one person into another', () => {
    expect(isRight('Paul', 'Saul')).toBe(false);
    expect(isRight('Cain', 'Abel')).toBe(false);
  });

  it('ignores case, punctuation, articles and surrounding words', () => {
    expect(isRight('the red sea', 'Red Sea')).toBe(true);
    expect(isRight('I think it was Moses', 'Moses')).toBe(true);
    expect(isRight('GOSHEN!', 'Goshen')).toBe(true);
  });

  it('accepts listed alternatives and numbers either way', () => {
    expect(isRight('lentil stew', 'Pottage', ['lentil stew'])).toBe(true);
    expect(isRight('12', 'Twelve')).toBe(true);
    expect(isRight('seventy and five', '75')).toBe(true);
    expect(normalise('Seventy-five')).toBe('75');
  });

  it('refuses an answer that is one of the wrong options', () => {
    expect(isRight('Leah', 'Rachel', [], ['Leah', 'Dinah', 'Rebekah'])).toBe(false);
  });

  it('accepts the distinctive word of a longer answer', () => {
    expect(isRight('Machpelah', 'Cave of Machpelah')).toBe(true);
  });
});

describe('rounds', () => {
  const bank: Question[] = [
    q({ id: 'a', a: 'Light', w: ['Dark', 'Water', 'Fire'] }),
    q({ id: 'b', l: 2, a: 'Moses', w: ['Aaron', 'Joshua', 'Caleb'] }),
    q({ id: 'c', l: 3, a: 'Goshen', w: ['Zoan', 'Pithom', 'Rameses'] }),
    q({ id: 'd', t: 'tf', a: true }),
    q({ id: 'e', t: 'order', l: 3, items: ['One', 'Two', 'Three'] }),
    q({ id: 'f', t: 'match', l: 3, pairs: [['A', '1'], ['B', '2'], ['C', '3']] }),
    q({ id: 'g', t: 'fill', l: 3, text: 'In the [beginning] God [created]', w: ['end'] }),
    q({ id: 'h', l: 2, a: 'A ladder reaching to heaven', ty: 0, w: ['A bush', 'A cloud', 'A sea'] }),
  ];

  it('asks Easy entirely as multiple choice or true-or-false', () => {
    const round = buildRound(bank, 'easy', 10, 7);
    expect(round.length).toBeGreaterThan(0);
    expect(round.every((asked) => asked.as === 'choice' || asked.as === 'tf')).toBe(true);
  });

  it('puts every interactive kind into Hard and types what can be typed', () => {
    const round = buildRound(bank, 'hard', 10, 7);
    const kinds = new Set(round.map((asked) => asked.as));
    expect(kinds.has('order')).toBe(true);
    expect(kinds.has('match')).toBe(true);
    expect(kinds.has('fill')).toBe(true);
    expect(round.find((asked) => asked.question.id === 'b')?.as).toBe('typed');
    // An answer too long to type is still offered as a choice.
    expect(round.find((asked) => asked.question.id === 'h')?.as).toBe('choice');
  });

  it('never hands over an order question already in order', () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const asked = buildRound(bank, 'hard', 10, seed).find((entry) => entry.as === 'order');
      if (asked?.as === 'order') expect(asked.shuffled).not.toEqual(asked.items);
    }
  });

  it('includes the right answer among the choices', () => {
    for (const asked of buildRound(bank, 'easy', 10, 3)) {
      if (asked.as === 'choice') expect(asked.options).toContain(asked.answer);
    }
  });

  it('rewards speed and a run of right answers', () => {
    expect(pointsFor('easy', null, 0)).toBe(100);
    expect(pointsFor('medium', 30, 0)).toBe(210);
    expect(pointsFor('hard', 0, 4)).toBe(400);
  });
});

/** Chapters per book, Genesis to Revelation, to check each bank is the right size. */
const CHAPTERS = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12, 8, 66, 52,
  5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4, 28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5,
  3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1, 22,
];

describe('the banks', () => {
  it('sizes a bank by the book: ten, twenty or fifty', () => {
    expect(expectedCount(4)).toBe(10);
    expect(expectedCount(9)).toBe(10);
    expect(expectedCount(10)).toBe(20);
    expect(expectedCount(29)).toBe(20);
    expect(expectedCount(30)).toBe(50);
    expect(expectedCount(150)).toBe(50);
  });

  it('gives every written book exactly the questions its length calls for', async () => {
    for (let bookId = 1; bookId <= 66; bookId += 1) {
      const bank = await bankFor(bookId);
      if (bank.length === 0) continue;
      expect(bank.length, `book ${bookId}`).toBe(expectedCount(CHAPTERS[bookId - 1]));
    }
  });
});
