/**
 * The people and places inside a verse.
 *
 * This used to work from a list of names and a regular expression, which could only ever
 * find names, not people. Every Mary in Scripture matched the same entry, so the card had
 * to hedge about which one a verse meant, and names belonging to several people were left
 * out altogether rather than marked wrongly.
 *
 * It now works the other way round. The build records, for each verse, which individuals
 * are named in it and under which spelling — checked against this translation's own text,
 * so a mark never appears on a word that is not there. Mary the mother of Jesus and Mary
 * Magdalene are different people with different verses, and the reader marks whichever one
 * the verse is actually about.
 *
 * Source: TIPNR, from STEPBible and Tyndale House Cambridge, under CC BY 4.0.
 */

import { inDesktopApp, invokeCommand } from './tauri';

/** An individual: one person, or one place. */
export type Subject = {
  id: string;
  name: string;
  kind: 'person' | 'place' | 'other';
  /** Male, Female, Group, Supernatural, and so on. */
  type: string;
  summary: string;
  tribe?: string;
  area?: string;
  /** The name a gazetteer knows a place by. */
  near?: string;
  parents: string[];
  siblings: string[];
  partners: string[];
  children: string[];
  /** The first verses where this individual is named, as [bookId, chapter, verse]. */
  where: Array<[number, number, number]>;
  /** How many verses name them in all. */
  total: number;
};

/**
 * "chapter:verse" to the names found in it.
 *
 * Each entry is [spelling, subject id] and, for anything that is not a person, the kind
 * as a third element. People are by far the common case and carry nothing, which keeps
 * the file small.
 */
export type Mark = [string, string] | [string, string, Subject['kind']];
export type BookMarks = Record<string, Mark[]>;

type RawSubject = {
  n: string;
  k: Subject['kind'];
  t: string;
  s: string;
  tribe?: string;
  area?: string;
  near?: string;
  p?: string[];
  b?: string[];
  m?: string[];
  c?: string[];
  w: Array<[number, number, number]>;
  total: number;
};

function dataUrl(file: string): URL {
  return new URL(file, new URL('./bible/', document.baseURI));
}

const markCache = new Map<number, BookMarks>();
let subjectsPromise: Promise<Map<string, Subject>> | null = null;

/** The marks for one book. Fetched once; a book without any is simply empty. */
export async function marksFor(bookId: number): Promise<BookMarks> {
  const already = markCache.get(bookId);
  if (already) return already;

  let data: BookMarks = {};
  try {
    if (inDesktopApp()) {
      data = (await invokeCommand<BookMarks>('mentions', { bookId })) ?? {};
    } else {
      const response = await fetch(dataUrl(`names-${bookId}.json`));
      if (response.ok) data = (await response.json()) as BookMarks;
    }
  } catch {
    // Reading without the marks is better than not reading.
  }

  markCache.set(bookId, data);
  return data;
}

/**
 * Everyone and everywhere, fetched the first time a name is opened.
 *
 * It is a megabyte, so it is not loaded with the page: the reader can mark names from
 * the per-book file alone, and only needs this once someone asks who a name belongs to.
 */
export function allSubjects(): Promise<Map<string, Subject>> {
  if (subjectsPromise) return subjectsPromise;

  subjectsPromise = (async () => {
    const out = new Map<string, Subject>();
    try {
      const raw = inDesktopApp()
        ? ((await invokeCommand<Record<string, RawSubject>>('subjects')) ?? {})
        : await (await fetch(dataUrl('names.json'))).json();

      for (const [id, value] of Object.entries(raw as Record<string, RawSubject>)) {
        out.set(id, {
          id,
          name: value.n,
          kind: value.k,
          type: value.t ?? '',
          summary: value.s ?? '',
          tribe: value.tribe,
          area: value.area,
          near: value.near,
          parents: value.p ?? [],
          siblings: value.b ?? [],
          partners: value.m ?? [],
          children: value.c ?? [],
          where: value.w ?? [],
          total: value.total ?? 0,
        });
      }
    } catch {
      // An empty map means names open nothing rather than the reader breaking.
    }
    return out;
  })();

  return subjectsPromise;
}

/** The readable name inside an identifier, for a relative with no record of their own. */
export function nameOfId(id: string): string {
  const name = id.split('@')[0] ?? id;
  return name.replace(/_/g, ' ');
}

export type Piece =
  | { type: 'text'; text: string }
  // `ids` holds every individual this spelling could mean in this verse. It is almost
  // always one; in about one marked verse in 250 — "Mary" twice in John 19:25, two
  // different Harans in Genesis 11:31 — the text alone does not say which occurrence is
  // which, and the card offers both rather than picking one.
  | { type: 'mark'; text: string; ids: string[]; kind: Subject['kind'] };

/**
 * Splits a verse into plain runs and marked names.
 *
 * Longest spelling first, so "Bethlehemjudah" is marked whole rather than as Bethlehem
 * with stray letters after it, and a name is never marked inside a longer word.
 */
export function markUp(text: string, found: Mark[] | undefined): Piece[] {
  if (!found || found.length === 0) return [{ type: 'text', text }];

  // A spelling can stand for more than one individual in the same verse, so the
  // spellings are gathered first and each carries everyone it could mean.
  const byForm = new Map<string, { ids: string[]; kind: Subject['kind'] }>();
  for (const [form, id, kind] of found) {
    const entry = byForm.get(form) ?? { ids: [], kind: kind ?? 'person' };
    if (!entry.ids.includes(id)) entry.ids.push(id);
    byForm.set(form, entry);
  }

  const wanted = [...byForm.entries()].sort((a, b) => b[0].length - a[0].length);
  const taken: Array<{
    from: number;
    to: number;
    ids: string[];
    kind: Subject['kind'];
    text: string;
  }> = [];

  for (const [form, { ids, kind }] of wanted) {
    const pattern = new RegExp(`\\b${form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
    let match = pattern.exec(text);

    while (match) {
      const from = match.index;
      const to = from + match[0].length;
      // A longer name already covering this run wins, and the letter after a name must
      // not be a letter, or "Adam" would match inside "Adamah".
      const clash = taken.some((piece) => from < piece.to && to > piece.from);
      const next = text[to] ?? '';
      if (!clash && !/[A-Za-z]/.test(next)) {
        taken.push({ from, to, ids, kind, text: match[0] });
      }
      match = pattern.exec(text);
    }
  }

  if (taken.length === 0) return [{ type: 'text', text }];
  taken.sort((a, b) => a.from - b.from);

  const pieces: Piece[] = [];
  let index = 0;
  for (const piece of taken) {
    if (piece.from > index) pieces.push({ type: 'text', text: text.slice(index, piece.from) });
    pieces.push({ type: 'mark', text: piece.text, ids: piece.ids, kind: piece.kind });
    index = piece.to;
  }
  if (index < text.length) pieces.push({ type: 'text', text: text.slice(index) });

  return pieces;
}
