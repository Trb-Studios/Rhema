/**
 * Spaced review.
 *
 * The problem this app exists for is not reading the Bible but remembering it. Saving a
 * verse puts it in review; review brings it back just as it is about to be forgotten,
 * which is when seeing it again does the most good.
 *
 * The schedule is SM-2, the method behind most flashcard software: each card carries how
 * easily it comes back, and the gap to the next showing grows or shrinks with the
 * answer. It needs no AI, only honest answers.
 */

import { useCallback } from 'react';
import { addDays, today } from './dates';
import { createStore, useStore } from './store';

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export type Card = {
  /** bookId:chapter:verse, matching a saved verse. */
  id: string;
  /** Days until it is next due. */
  interval: number;
  /** How readily it comes back. Lower means shown more often. */
  ease: number;
  /** Times answered without forgetting. Reset by "again". */
  streak: number;
  /** Times forgotten after having been learned. */
  lapses: number;
  /** When it next comes up, as an ISO date. */
  due: string;
  lastSeen: string | null;
};

const store = createStore<Record<string, Card>>('rhema.review', {});

const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

function plusDays(days: number): string {
  return addDays(today(), Math.round(days));
}

export function newCard(id: string): Card {
  return {
    id,
    interval: 0,
    ease: DEFAULT_EASE,
    streak: 0,
    lapses: 0,
    // Due at once, so something saved today can be reviewed today.
    due: today(),
    lastSeen: null,
  };
}

/**
 * Where a card goes next.
 *
 * "Again" sends it back to the start of the queue and makes it harder, because
 * forgetting is the signal that the gap was too long. The others lengthen the gap by
 * how easily it came back.
 */
export function schedule(card: Card, grade: Grade): Card {
  const next: Card = { ...card, lastSeen: today() };

  if (grade === 'again') {
    next.ease = Math.max(MIN_EASE, card.ease - 0.2);
    next.interval = 0;
    next.streak = 0;
    next.lapses = card.lapses + 1;
    next.due = today();
    return next;
  }

  next.streak = card.streak + 1;

  if (grade === 'hard') {
    next.ease = Math.max(MIN_EASE, card.ease - 0.15);
    next.interval = card.interval === 0 ? 1 : card.interval * 1.2;
  } else if (grade === 'good') {
    next.interval = card.interval === 0 ? 1 : card.interval === 1 ? 3 : card.interval * card.ease;
  } else {
    next.ease = card.ease + 0.15;
    next.interval = card.interval === 0 ? 3 : card.interval * card.ease * 1.3;
  }

  // Beyond a year the gap stops meaning much, and a verse worth keeping is worth
  // seeing once a year.
  next.interval = Math.min(next.interval, 365);
  next.due = plusDays(next.interval);
  return next;
}

export function isDue(card: Card): boolean {
  return card.due <= today();
}

export function useReview() {
  const [cards, setCards] = useStore(store);

  /** Makes sure every saved verse has a card, and drops cards for verses let go. */
  const sync = useCallback(
    (ids: string[]) => {
      setCards((current) => {
        const wanted = new Set(ids);
        const next: Record<string, Card> = {};
        let changed = false;

        for (const id of ids) {
          next[id] = current[id] ?? newCard(id);
          if (!current[id]) changed = true;
        }
        for (const id of Object.keys(current)) {
          if (!wanted.has(id)) changed = true;
        }

        return changed ? next : current;
      });
    },
    [setCards],
  );

  const answer = useCallback(
    (id: string, grade: Grade) => {
      setCards((current) => {
        const card = current[id] ?? newCard(id);
        return { ...current, [id]: schedule(card, grade) };
      });
    },
    [setCards],
  );

  const due = Object.values(cards).filter(isDue);

  return {
    cards,
    due,
    sync,
    answer,
    /** How many are waiting, for the badge in the header. */
    dueCount: due.length,
    /** Cards seen at least once and not forgotten since. */
    learned: Object.values(cards).filter((card) => card.streak > 0 && card.interval >= 7).length,
  };
}

/** A plain reading of when a card comes back, for the buttons. */
export function nextShowing(card: Card, grade: Grade): string {
  const after = schedule(card, grade);
  if (after.interval === 0) return 'today';
  if (after.interval < 1.5) return 'tomorrow';
  if (after.interval < 30) return `${Math.round(after.interval)} days`;
  if (after.interval < 365) return `${Math.round(after.interval / 30)} months`;
  return 'a year';
}
