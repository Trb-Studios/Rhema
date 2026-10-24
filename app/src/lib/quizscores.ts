/**
 * Best scores and stars, per book and level, kept on this device and in backups.
 */

import { useCallback } from 'react';
import { createStore, useStore } from './store';
import type { Level } from './quizbank';

export type Record_ = {
  best: number;
  stars: number;
  plays: number;
  /** Fraction right in the last finished round. */
  last: number;
  at: string;
};

type Scores = Record<string, Record_>;

const store = createStore<Scores>('rhema.quiz', {});

export function keyOf(bookId: number, level: Level) {
  return `${bookId}:${level}`;
}

/** Stars for a round: three for nine in ten right, two for seven, one for finishing. */
export function starsFor(accuracy: number, finished: boolean): number {
  if (!finished) return 0;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
}

export function useQuizScores() {
  const [scores, setScores] = useStore(store);

  const record = useCallback(
    (bookId: number, level: Level, score: number, accuracy: number, finished: boolean) => {
      let isBest = false;
      setScores((current) => {
        const key = keyOf(bookId, level);
        const previous = current[key];
        isBest = !previous || score > previous.best;
        return {
          ...current,
          [key]: {
            best: Math.max(score, previous?.best ?? 0),
            stars: Math.max(starsFor(accuracy, finished), previous?.stars ?? 0),
            plays: (previous?.plays ?? 0) + 1,
            last: accuracy,
            at: new Date().toISOString(),
          },
        };
      });
      return isBest;
    },
    [setScores],
  );

  /** The most stars won on any level of a book, for the book grid. */
  const starsOf = useCallback(
    (bookId: number) =>
      Math.max(
        0,
        ...(['easy', 'medium', 'hard'] as Level[]).map((level) => scores[keyOf(bookId, level)]?.stars ?? 0),
      ),
    [scores],
  );

  return { scores, record, starsOf };
}
