/**
 * Reading Scripture.
 *
 * Inside the desktop app this calls into Rust, which reads the bundled SQLite database.
 * In `npm run dev:web` it fetches the JSON that `npm run data:build` writes, so the
 * reader can be designed against the real text without a Rust build. Both paths return
 * the same shapes, so no screen needs to know which one it is on.
 */

import { inDesktopApp, invokeCommand } from './tauri';

/**
 * Data files sit beside the page, so they are fetched by a relative path. An absolute
 * path would look for them at the server root, which is not where they are when the
 * build is served from a subpath.
 */
const DATA = new URL('./bible/', document.baseURI);

export type Book = {
  id: number;
  name: string;
  abbreviation: string;
  testament: 'OT' | 'NT';
  chapters: number;
  /** Total words in the book. The reading plan schedules by words, not chapters. */
  words: number;
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
    const response = await fetch(new URL('index.json', DATA));
    if (!response.ok) throw new Error('Run `npm run data:build` to generate the text.');
    bookCache = (await response.json()) as Book[];
  }

  return bookCache;
}

/** One chapter, verse by verse. Chapters are numbered from 1. */
export async function chapter(book: Book, number: number): Promise<Verse[]> {
  const key = `${book.id}:${number}`;
  const cached = chapterCache.get(key);
  if (cached) return cached;

  let verses: Verse[];

  if (inDesktopApp()) {
    verses = (await invokeCommand<Verse[]>('chapter', { book: book.name, chapter: number })) ?? [];
  } else {
    const response = await fetch(new URL(`${book.id}.json`, DATA));
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

  chapterCache.set(key, verses);
  return verses;
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
