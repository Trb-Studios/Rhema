/**
 * Searching the whole Bible.
 *
 * In the desktop app this goes to SQLite's full-text index through Rust, so a search
 * across 31,102 verses never waits on anything. In the browser the text is fetched once
 * and held in memory; it is about four megabytes, which is a moment on the first search
 * and nothing afterwards.
 *
 * Searching is done per edition. Searching the Hebrew finds Hebrew, not the English of
 * the same verses, because a search that quietly answered in another language would be
 * telling you something it had not been asked.
 */

import { books as loadBooks, wholeBook } from './bible';
import type { Book } from './bible';
import type { EditionId } from './editions';
import { inDesktopApp, invokeCommand } from './tauri';

export type Hit = {
  bookId: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  /** Where the match falls in `text`, so it can be marked without searching again. */
  at: [start: number, end: number];
};

/** Loaded editions, so a second search costs nothing. */
const loaded = new Map<EditionId, Array<Omit<Hit, 'at'>>>();

export const MAX_HITS = 200;

/** Lowercase, and strip Hebrew points and Greek accents so a search matches either way. */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-֑ͯ-ׇ]/g, '');
}

async function corpus(edition: EditionId) {
  const already = loaded.get(edition);
  if (already) return already;

  const all = await loadBooks();
  const relevant = all.filter((book) =>
    edition === 'kjv'
      ? true
      : edition === 'hebrew'
        ? book.testament === 'OT'
        : book.testament === 'NT',
  );

  const verses: Array<Omit<Hit, 'at'>> = [];
  for (const book of relevant) {
    for (const verse of await wholeBook(book, edition)) {
      verses.push({
        bookId: book.id,
        book: book.name,
        chapter: verse.chapter,
        verse: verse.verse,
        text: verse.text,
      });
    }
  }

  loaded.set(edition, verses);
  return verses;
}

/**
 * Finds every verse containing the query, in reading order.
 *
 * `onProgress` is called while the text loads on a first search, so the page can say
 * what it is doing instead of appearing to hang.
 */
export async function search(
  query: string,
  edition: EditionId,
  onProgress?: (loading: boolean) => void,
): Promise<Hit[]> {
  const needle = fold(query.trim());
  if (needle.length < 2) return [];

  if (inDesktopApp()) {
    const rows = await invokeCommand<Hit[]>('search', { query: query.trim(), edition });
    return rows ?? [];
  }

  if (!loaded.has(edition)) onProgress?.(true);
  const verses = await corpus(edition);
  onProgress?.(false);

  const hits: Hit[] = [];
  for (const verse of verses) {
    const at = fold(verse.text).indexOf(needle);
    if (at === -1) continue;
    hits.push({ ...verse, at: [at, at + needle.length] });
    if (hits.length >= MAX_HITS) break;
  }
  return hits;
}

/** How many verses were searched, for the line under the results. */
export function searchedCount(edition: EditionId): number {
  return loaded.get(edition)?.length ?? 0;
}

/** Splits a hit's text into the part before the match, the match, and the part after. */
export function around(hit: Hit): [before: string, match: string, after: string] {
  const [start, end] = hit.at;
  return [hit.text.slice(0, start), hit.text.slice(start, end), hit.text.slice(end)];
}

export type { Book };
