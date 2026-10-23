/**
 * Saved verses.
 *
 * A verse is saved by reference rather than by its words, so the collection does not go
 * stale when an edition is corrected, and the same reference can be read back in any
 * edition. The text is kept alongside only so the list can be shown without fetching
 * every chapter it mentions.
 */

import { useCallback } from 'react';
import { createStore, useStore } from './store';

export type SavedVerse = {
  bookId: number;
  book: string;
  chapter: number;
  verse: number;
  /** The words as they stood when it was saved, for showing in the list. */
  text: string;
  /** Which edition it was read in, so it opens back where it was found. */
  edition: string;
  savedAt: string;
};

const store = createStore<SavedVerse[]>('rhema.saved', []);

export function referenceOf(verse: Pick<SavedVerse, 'book' | 'chapter' | 'verse'>) {
  return `${verse.book} ${verse.chapter}:${verse.verse}`;
}

function idOf(verse: Pick<SavedVerse, 'bookId' | 'chapter' | 'verse'>) {
  return `${verse.bookId}:${verse.chapter}:${verse.verse}`;
}

export function useSaved() {
  const [saved, setSaved] = useStore(store);

  const isSaved = useCallback(
    (bookId: number, chapter: number, verse: number) =>
      saved.some((entry) => idOf(entry) === idOf({ bookId, chapter, verse })),
    [saved],
  );

  const toggle = useCallback(
    (verse: Omit<SavedVerse, 'savedAt'>) => {
      setSaved((current) => {
        const id = idOf(verse);
        if (current.some((entry) => idOf(entry) === id)) {
          return current.filter((entry) => idOf(entry) !== id);
        }
        // Newest first, which is the order the list reads best in.
        return [{ ...verse, savedAt: new Date().toISOString() }, ...current];
      });
    },
    [setSaved],
  );

  const remove = useCallback(
    (bookId: number, chapter: number, verse: number) => {
      const id = idOf({ bookId, chapter, verse });
      setSaved((current) => current.filter((entry) => idOf(entry) !== id));
    },
    [setSaved],
  );

  return { saved, isSaved, toggle, remove };
}
