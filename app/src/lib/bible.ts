/**
 * Reading Scripture.
 *
 * Inside the desktop app this calls into Rust, which reads the bundled SQLite database.
 * In `npm run dev:web` it fetches the JSON that `npm run data:build` writes, so the
 * reader can be designed against the real text without a Rust build. Both paths return
 * the same shapes, so no screen needs to know which one it is on.
 */

import { inDesktopApp, invokeCommand } from './tauri';
import type { EditionId } from './editions';

/**
 * Data files sit beside the page, so they are fetched by a relative path. An absolute
 * path would look for them at the server root, which is not where they are when the
 * build is served from a subpath.
 */
function dataUrl(file: string): URL {
  return new URL(file, new URL('./bible/', document.baseURI));
}

export type Book = {
  id: number;
  name: string;
  abbreviation: string;
  testament: 'OT' | 'NT';
  chapters: number;
  /** Total words in the book. The reading plan schedules by words, not chapters. */
  words: number;
  /** Words in each chapter, in order, so a day's reading can be an even amount. */
  chapterWords: number[];
};

export type Verse = {
  number: number;
  text: string;
  /** A section heading that opens at this verse, such as Psalm 119's acrostic letters. */
  heading?: string | null;
};

let bookCache: Book[] | null = null;
const chapterCache = new Map<string, Verse[]>();

/** Every book in canonical order, Genesis through Revelation. */
export async function books(): Promise<Book[]> {
  if (bookCache) return bookCache;

  if (inDesktopApp()) {
    bookCache = (await invokeCommand<Book[]>('books')) ?? [];
  } else {
    const response = await fetch(dataUrl('index.json'));
    if (!response.ok) throw new Error('Run `npm run data:build` to generate the text.');
    bookCache = (await response.json()) as Book[];
  }

  return bookCache;
}

/**
 * One chapter, verse by verse, in the edition asked for.
 *
 * An original-language edition is read as its own tradition numbers it, so a verse
 * number here need not line up with the English. Where an edition has nothing for a
 * chapter, the result is empty and the caller says so rather than silently falling back
 * to the English, which would look like the original and not be.
 */
export async function chapter(
  book: Book,
  number: number,
  edition: EditionId = 'kjv',
): Promise<Verse[]> {
  const key = `${edition}:${book.id}:${number}`;
  const cached = chapterCache.get(key);
  if (cached) return cached;

  let verses: Verse[];

  if (edition === 'kjv') {
    if (inDesktopApp()) {
      verses =
        (await invokeCommand<Verse[]>('chapter', { book: book.name, chapter: number })) ?? [];
    } else {
      const response = await fetch(dataUrl(`${book.id}.json`));
      if (!response.ok) throw new Error(`Could not load ${book.name}.`);
      const file = (await response.json()) as {
        chapters: string[][];
        headings?: Record<string, string>;
      };
      verses = (file.chapters[number - 1] ?? []).map((text, index) => ({
        number: index + 1,
        text,
        heading: file.headings?.[`${number}:${index + 1}`] ?? null,
      }));
    }
  } else if (inDesktopApp()) {
    verses =
      (await invokeCommand<Verse[]>('original', {
        edition,
        bookId: book.id,
        chapter: number,
      })) ?? [];
  } else {
    const response = await fetch(dataUrl(`${edition}-${book.id}.json`));
    if (!response.ok) return [];
    const file = (await response.json()) as Record<string, Array<[number, string]>>;
    verses = (file[String(number)] ?? []).map(([verseNumber, text]) => ({
      number: verseNumber,
      text,
    }));
  }

  chapterCache.set(key, verses);
  return verses;
}

/**
 * Every verse of a book at once, for searching.
 *
 * Fetches the book's file a single time. Asking for it chapter by chapter would fetch
 * the same file once per chapter, which for Psalms means 150 times over.
 */
export async function wholeBook(
  book: Book,
  edition: EditionId = 'kjv',
): Promise<Array<{ chapter: number; verse: number; text: string }>> {
  const out: Array<{ chapter: number; verse: number; text: string }> = [];

  if (inDesktopApp()) {
    for (let number = 1; number <= book.chapters; number += 1) {
      for (const verse of await chapter(book, number, edition)) {
        out.push({ chapter: number, verse: verse.number, text: verse.text });
      }
    }
    return out;
  }

  if (edition === 'kjv') {
    const response = await fetch(dataUrl(`${book.id}.json`));
    if (!response.ok) return out;
    const file = (await response.json()) as { chapters: string[][] };
    file.chapters.forEach((verses, index) => {
      verses.forEach((text, verseIndex) => {
        out.push({ chapter: index + 1, verse: verseIndex + 1, text });
      });
    });
    return out;
  }

  const response = await fetch(dataUrl(`${edition}-${book.id}.json`));
  if (!response.ok) return out;
  const file = (await response.json()) as Record<string, Array<[number, string]>>;
  for (const [chapterNumber, verses] of Object.entries(file)) {
    for (const [verseNumber, text] of verses) {
      out.push({ chapter: Number(chapterNumber), verse: verseNumber, text });
    }
  }
  out.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
  return out;
}

/** The chapter before this one, crossing into the previous book. Null at Genesis 1. */
export function previousChapter(all: Book[], book: Book, number: number) {
  if (number > 1) return { book, chapter: number - 1 };
  const index = all.findIndex((candidate) => candidate.id === book.id);
  if (index <= 0) return null;
  const earlier = all[index - 1];
  return { book: earlier, chapter: earlier.chapters };
}

/** The chapter after this one, crossing into the next book. Null at Revelation 22. */
export function nextChapter(all: Book[], book: Book, number: number) {
  if (number < book.chapters) return { book, chapter: number + 1 };
  const index = all.findIndex((candidate) => candidate.id === book.id);
  if (index < 0 || index >= all.length - 1) return null;
  return { book: all[index + 1], chapter: 1 };
}
