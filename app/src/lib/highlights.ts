/**
 * The 30 highlight colours: ten reds, ten greens, ten blues, light through dark.
 *
 * They carry no built-in meaning. Each one can be named for whatever the person uses it
 * for, and the names live with their data rather than in the code. Highlights draw at
 * 42% over the page, so Scripture stays readable in both themes.
 */

import { useCallback } from 'react';
import { createStore, useStore } from './store';

export const HIGHLIGHT_OPACITY = 0.42;

export type Highlight = {
  /** 0 to 29. Stored with the verse, so renaming or restyling never loses a mark. */
  index: number;
  /** The default name, shown until the person renames it. */
  name: string;
  colour: string;
};

const FAMILIES = [
  { label: 'Red', hue: 2 },
  { label: 'Green', hue: 138 },
  { label: 'Blue', hue: 215 },
];

export const HIGHLIGHTS: Highlight[] = FAMILIES.flatMap((family, familyIndex) =>
  Array.from({ length: 10 }, (_, step) => ({
    index: familyIndex * 10 + step,
    name: `${family.label} ${step + 1}`,
    colour: `hsl(${family.hue + step * 3} ${82 - step * 1.5}% ${86 - step * 4.4}%)`,
  })),
);

/** A dozen evenly spread colours, for the strip that appears when a verse is selected. */
export const QUICK_PICKS = [0, 3, 6, 9, 10, 13, 16, 19, 20, 23, 26, 29].map(
  (index) => HIGHLIGHTS[index],
);

/**
 * Which verses are marked, and in which colour.
 *
 * Keyed by book, chapter and verse together: keying on the verse number alone once put
 * one mark on Genesis 1:3 and John 3:3 at the same time.
 *
 * This goes through the shared store rather than a copy held in the reader. Three
 * separate bugs in this project came from a component keeping its own copy of shared
 * state, and the library needs to read these marks while the reader is writing them.
 */
export type Marks = Record<string, number>;

const store = createStore<Marks>('rhema.highlights', {});

export function markKey(bookId: number, chapter: number, verse: number): string {
  return `${bookId}:${chapter}:${verse}`;
}

/** Reads a key back, for anything listing marks rather than drawing one. */
export function readKey(key: string): { bookId: number; chapter: number; verse: number } | null {
  const parts = key.split(':').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return { bookId: parts[0], chapter: parts[1], verse: parts[2] };
}

export function useHighlights() {
  const [marks, setMarks] = useStore(store);

  const colourOf = useCallback(
    (bookId: number, chapter: number, verse: number): Highlight | undefined => {
      const index = marks[markKey(bookId, chapter, verse)];
      return index === undefined ? undefined : HIGHLIGHTS[index];
    },
    [marks],
  );

  const mark = useCallback(
    (bookId: number, chapter: number, verse: number, index: number) => {
      setMarks((current) => ({ ...current, [markKey(bookId, chapter, verse)]: index }));
    },
    [setMarks],
  );

  const clear = useCallback(
    (bookId: number, chapter: number, verse: number) => {
      setMarks((current) => {
        const key = markKey(bookId, chapter, verse);
        if (!(key in current)) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });
    },
    [setMarks],
  );

  return { marks, colourOf, mark, clear };
}
