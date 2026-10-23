/**
 * Where else Scripture says this.
 *
 * A concordance finds a word; this finds the places a verse is quoted, echoed or
 * answered. Genesis 1:1 points at John 1:1, Hebrews 11:3 and Isaiah 45:18 — connections
 * no amount of searching for "beginning" would turn up.
 *
 * The references are ranked by how many readers voted each link a good one, so the
 * strongest come first, and at most eight are kept for any verse: forty references are
 * less useful than eight, because the reader has to weigh them all.
 *
 * Source: openbible.info, CC BY, built on the Treasury of Scripture Knowledge.
 */

import { inDesktopApp, invokeCommand } from './tauri';

/** [book, chapter, verse] or [book, chapter, verse, lastVerse] for a passage. */
export type Target = [number, number, number] | [number, number, number, number];

export type BookRefs = Record<string, Target[]>;

function dataUrl(file: string): URL {
  return new URL(file, new URL('./bible/', document.baseURI));
}

const cache = new Map<number, BookRefs>();

export async function refsFor(bookId: number): Promise<BookRefs> {
  const already = cache.get(bookId);
  if (already) return already;

  let data: BookRefs = {};
  try {
    if (inDesktopApp()) {
      data = (await invokeCommand<BookRefs>('cross_references', { bookId })) ?? {};
    } else {
      const response = await fetch(dataUrl(`refs-${bookId}.json`));
      if (response.ok) data = (await response.json()) as BookRefs;
    }
  } catch {
    // Reading without the references is better than not reading.
  }

  cache.set(bookId, data);
  return data;
}

/** "Hebrews 11:3" or "John 1:1–3", as a reader would write it. */
export function referenceOf(target: Target, nameOf: (bookId: number) => string): string {
  const [bookId, chapter, verse, last] = target;
  const name = nameOf(bookId);
  return last && last > verse
    ? `${name} ${chapter}:${verse}–${last}`
    : `${name} ${chapter}:${verse}`;
}
