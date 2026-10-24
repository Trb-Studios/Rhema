/**
 * Sticky notes, kept per book.
 *
 * A chapter note was the wrong size for most of what a reader jots down: a thought that
 * belongs to Genesis as a whole, a question that runs across ten chapters. Sticky notes
 * belong to the book, so they are all still there whichever chapter is open, and each
 * can optionally be pinned to the verse or phrase that prompted it.
 */

import { useCallback } from 'react';
import { createStore, useStore } from './store';

export const STICKY_COLOURS = ['amber', 'rose', 'sky', 'mint', 'violet', 'stone'] as const;
export type StickyColour = (typeof STICKY_COLOURS)[number];

/** Each colour as a fill and an ink, chosen to read in both themes. */
export const STICKY_TONES: Record<StickyColour, { fill: string; ink: string; edge: string }> = {
  amber: { fill: '#f6e3a1', ink: '#3d3000', edge: '#e2c766' },
  rose: { fill: '#f6c9cf', ink: '#46141d', edge: '#e79aa6' },
  sky: { fill: '#c6e0f7', ink: '#0f2c45', edge: '#8fbfe8' },
  mint: { fill: '#c9ecd6', ink: '#0f3520', edge: '#8fd1a9' },
  violet: { fill: '#dcd2fa', ink: '#251a4d', edge: '#b4a3f0' },
  stone: { fill: '#e6e0d6', ink: '#2a2418', edge: '#cbbfa9' },
};

export type Sticky = {
  id: string;
  text: string;
  colour: StickyColour;
  /** The chapter and verse it was written beside, if any. */
  anchor?: { chapter: number; verse?: number; quote?: string };
  created: string;
  updated: string;
};

type Stickies = Record<string, Sticky[]>;

const store = createStore<Stickies>('rhema.stickies', {});

export function stickyStore() {
  return store;
}

export function addSticky(
  bookId: number,
  sticky: Partial<Pick<Sticky, 'text' | 'colour' | 'anchor'>> = {},
): string {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  store.set((current) => {
    const list = current[bookId] ?? [];
    // A new note takes the next colour round, so a board of them is not all one shade.
    const colour = sticky.colour ?? STICKY_COLOURS[list.length % STICKY_COLOURS.length];
    return {
      ...current,
      [bookId]: [
        { id, text: sticky.text ?? '', colour, anchor: sticky.anchor, created: now, updated: now },
        ...list,
      ],
    };
  });
  return id;
}

export function useStickies(bookId: number) {
  const [all, setAll] = useStore(store);
  const list = all[bookId] ?? [];

  const update = useCallback(
    (id: string, changes: Partial<Pick<Sticky, 'text' | 'colour'>>) => {
      setAll((current) => ({
        ...current,
        [bookId]: (current[bookId] ?? []).map((sticky) =>
          sticky.id === id ? { ...sticky, ...changes, updated: new Date().toISOString() } : sticky,
        ),
      }));
    },
    [bookId, setAll],
  );

  const remove = useCallback(
    (id: string) => {
      setAll((current) => {
        const next = (current[bookId] ?? []).filter((sticky) => sticky.id !== id);
        const copy = { ...current };
        if (next.length) copy[bookId] = next;
        else delete copy[bookId];
        return copy;
      });
    },
    [bookId, setAll],
  );

  const reorder = useCallback(
    (ordered: Sticky[]) => setAll((current) => ({ ...current, [bookId]: ordered })),
    [bookId, setAll],
  );

  return { list, update, remove, reorder };
}

/** Every book's notes, for the Notebook screen and backups. */
export function useAllStickies(): Stickies {
  return useStore(store)[0];
}
