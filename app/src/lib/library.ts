/**
 * Everything you have marked, in one place.
 *
 * Notes, highlights and saved verses were each only reachable from the passage they
 * belonged to. You could write a note on Genesis 12, move on, and never find it again
 * without remembering where it was. For an app whose point is remembering what you
 * read, half of what you capture being unfindable is the wrong way round.
 *
 * This gathers the three into one list that can be filtered and searched. It holds
 * only references and the words already stored, so nothing is fetched to build it.
 */

import type { Book } from './bible';
import { HIGHLIGHTS, readKey } from './highlights';
import type { Marks } from './highlights';
import type { SavedVerse } from './saved';

export type EntryKind = 'note' | 'highlight' | 'saved';

export type Entry = {
  kind: EntryKind;
  bookId: number;
  book: string;
  chapter: number;
  /** Absent for a note, which belongs to a whole chapter. */
  verse?: number;
  /** The note's words, the saved verse's words, or empty for a highlight. */
  text: string;
  /** The colour index, for a highlight. */
  colour?: number;
  /** When it was kept, where that is known. Saved verses carry a date; the rest do not. */
  at?: string;
};

/** Sorts into reading order: Genesis before Revelation, chapter 1 before chapter 2. */
function inReadingOrder(a: Entry, b: Entry): number {
  return a.bookId - b.bookId || a.chapter - b.chapter || (a.verse ?? 0) - (b.verse ?? 0);
}

/**
 * Builds the list.
 *
 * An entry whose book is not in the list given is dropped rather than shown with a
 * blank name: that happens only if storage holds a book id the text no longer has,
 * which would be a bug worth seeing as a missing row rather than a nameless one.
 */
export function gather({
  books,
  notes,
  marks,
  saved,
}: {
  books: Book[];
  notes: Record<string, string>;
  marks: Marks;
  saved: SavedVerse[];
}): Entry[] {
  const byId = new Map(books.map((book) => [book.id, book]));
  const entries: Entry[] = [];

  for (const [key, text] of Object.entries(notes)) {
    if (!text.trim()) continue;
    const [bookId, chapter] = key.split(':').map(Number);
    const book = byId.get(bookId);
    if (!book) continue;
    entries.push({ kind: 'note', bookId, book: book.name, chapter, text });
  }

  for (const [key, colour] of Object.entries(marks)) {
    const where = readKey(key);
    if (!where) continue;
    const book = byId.get(where.bookId);
    if (!book) continue;
    entries.push({
      kind: 'highlight',
      bookId: where.bookId,
      book: book.name,
      chapter: where.chapter,
      verse: where.verse,
      text: '',
      colour,
    });
  }

  for (const verse of saved) {
    entries.push({
      kind: 'saved',
      bookId: verse.bookId,
      book: verse.book,
      chapter: verse.chapter,
      verse: verse.verse,
      text: verse.text,
      at: verse.savedAt,
    });
  }

  return entries.sort(inReadingOrder);
}

export type Filter = {
  kinds: EntryKind[];
  /** A colour index, for narrowing to one highlight colour. */
  colour?: number;
  query: string;
};

/** Narrows the list. An empty `kinds` means everything, not nothing. */
export function filter(entries: Entry[], { kinds, colour, query }: Filter): Entry[] {
  const needle = query.trim().toLowerCase();

  return entries.filter((entry) => {
    if (kinds.length > 0 && !kinds.includes(entry.kind)) return false;
    if (colour !== undefined && entry.colour !== colour) return false;
    if (!needle) return true;

    const reference = `${entry.book} ${entry.chapter}${entry.verse ? `:${entry.verse}` : ''}`;
    return entry.text.toLowerCase().includes(needle) || reference.toLowerCase().includes(needle);
  });
}

/** How many of each kind, for the filter buttons. */
export function countKinds(entries: Entry[]): Record<EntryKind, number> {
  return {
    note: entries.filter((entry) => entry.kind === 'note').length,
    highlight: entries.filter((entry) => entry.kind === 'highlight').length,
    saved: entries.filter((entry) => entry.kind === 'saved').length,
  };
}

/** The highlight colours actually in use, so the picker offers only those. */
export function coloursUsed(entries: Entry[]): Array<{ index: number; count: number }> {
  const counts = new Map<number, number>();
  for (const entry of entries) {
    if (entry.colour === undefined) continue;
    counts.set(entry.colour, (counts.get(entry.colour) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([index, count]) => ({ index, count }))
    .sort((a, b) => a.index - b.index);
}

/** The name of a colour, for a label. */
export function colourName(index: number): string {
  return HIGHLIGHTS[index]?.name ?? 'Colour';
}

/** Groups into books, keeping reading order, for the headings down the list. */
export function byBook(
  entries: Entry[],
): Array<{ book: string; bookId: number; entries: Entry[] }> {
  const groups: Array<{ book: string; bookId: number; entries: Entry[] }> = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.bookId === entry.bookId) last.entries.push(entry);
    else groups.push({ book: entry.book, bookId: entry.bookId, entries: [entry] });
  }
  return groups;
}
