/**
 * Highlighting any words, not only whole verses.
 *
 * A highlight is a stretch of text from one point to another: a verse and a character
 * within it at each end, so a phrase can sit inside one verse or run across several.
 * Positions count characters of the verse as this translation prints it, which is fixed,
 * so a highlight lands on the same words every time the chapter opens.
 *
 * Whole-verse marks made before this existed live on in `highlights.ts` and are still
 * drawn; both are listed together on the Highlights screen.
 */

import { useCallback } from 'react';
import { createStore, useStore } from './store';

export type Point = { verse: number; offset: number };

export type Phrase = {
  id: string;
  bookId: number;
  chapter: number;
  from: Point;
  to: Point;
  /** 0 to 29, an index into HIGHLIGHTS. */
  colour: number;
  /** The words highlighted, kept so the list can show them without loading the chapter. */
  text: string;
  created: string;
};

const store = createStore<Phrase[]>('rhema.phrases', []);

export function phraseStore() {
  return store;
}

function before(a: Point, b: Point): boolean {
  return a.verse < b.verse || (a.verse === b.verse && a.offset < b.offset);
}

/** Puts the two ends in reading order, whichever way the selection was dragged. */
export function ordered(a: Point, b: Point): [Point, Point] {
  return before(b, a) ? [b, a] : [a, b];
}

export function usePhrases() {
  const [phrases, setPhrases] = useStore(store);

  const add = useCallback(
    (phrase: Omit<Phrase, 'id' | 'created'>) => {
      const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
      const created = new Date().toISOString();
      setPhrases((current) => {
        // A new highlight over exactly the same words replaces the old one rather than
        // stacking a second colour beneath it.
        const kept = current.filter(
          (other) =>
            !(
              other.bookId === phrase.bookId &&
              other.chapter === phrase.chapter &&
              other.from.verse === phrase.from.verse &&
              other.from.offset === phrase.from.offset &&
              other.to.verse === phrase.to.verse &&
              other.to.offset === phrase.to.offset
            ),
        );
        return [...kept, { ...phrase, id, created }];
      });
      return id;
    },
    [setPhrases],
  );

  const remove = useCallback(
    (id: string) => setPhrases((current) => current.filter((phrase) => phrase.id !== id)),
    [setPhrases],
  );

  const recolour = useCallback(
    (id: string, colour: number) =>
      setPhrases((current) =>
        current.map((phrase) => (phrase.id === id ? { ...phrase, colour } : phrase)),
      ),
    [setPhrases],
  );

  return { phrases, add, remove, recolour };
}

/** The highlighted stretches falling inside one verse, as character ranges within it. */
export function rangesIn(
  phrases: Phrase[],
  bookId: number,
  chapter: number,
  verse: number,
  length: number,
): Array<{ from: number; to: number; colour: number; id: string }> {
  const out: Array<{ from: number; to: number; colour: number; id: string }> = [];
  for (const phrase of phrases) {
    if (phrase.bookId !== bookId || phrase.chapter !== chapter) continue;
    if (verse < phrase.from.verse || verse > phrase.to.verse) continue;
    const from = verse === phrase.from.verse ? phrase.from.offset : 0;
    const to = verse === phrase.to.verse ? phrase.to.offset : length;
    if (to > from) out.push({ from, to, colour: phrase.colour, id: phrase.id });
  }
  return out;
}

export type Segment = {
  text: string;
  /** Where this segment starts within the verse. */
  offset: number;
  colour?: number;
  phrase?: string;
};

/**
 * Cuts a run of text at every highlight boundary, so each piece is either wholly inside
 * a highlight or wholly outside one. Where highlights overlap, the newer one is drawn,
 * which matches what the person last did.
 */
export function segment(
  text: string,
  offset: number,
  ranges: Array<{ from: number; to: number; colour: number; id: string }>,
): Segment[] {
  const end = offset + text.length;
  const cuts = new Set<number>([offset, end]);
  for (const range of ranges) {
    if (range.from > offset && range.from < end) cuts.add(range.from);
    if (range.to > offset && range.to < end) cuts.add(range.to);
  }
  const points = [...cuts].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    let covering: (typeof ranges)[number] | undefined;
    for (const range of ranges) {
      if (range.from <= from && range.to >= to) covering = range;
    }
    out.push({
      text: text.slice(from - offset, to - offset),
      offset: from,
      colour: covering?.colour,
      phrase: covering?.id,
    });
  }
  return out;
}
