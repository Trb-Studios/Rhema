/**
 * Word study on the Hebrew and Greek.
 *
 * Each word in an original edition carries its dictionary form and its parsing. The
 * parsing arrives as a terse code, which is read back here into plain words. Codes this
 * does not recognise are shown as they stand rather than guessed at, so a reader is
 * never told a word is something it may not be.
 */

import type { EditionId } from './editions';
import { inDesktopApp } from './tauri';

const DATA = new URL('./bible/', document.baseURI);

/** One word as the text carries it: written form, dictionary form, parsing code. */
export type Word = [written: string, lemma: string, parsing: string];

/** Every word of a book, keyed "chapter:verse". */
type BookWords = Record<string, Word[]>;

const bookCache = new Map<string, BookWords>();
let totals: Record<string, Record<string, number>> | null = null;

/** headword, transliteration, gloss, definition */
export type LexiconEntry = [string, string, string, string];
let lexicon: Record<string, Record<string, LexiconEntry>> | null = null;

/**
 * What a dictionary entry means.
 *
 * Returns null where the lexicon has nothing, which is mostly proper names. The card
 * then shows the word without a meaning rather than inventing one.
 */
export async function meaningOf(edition: EditionId, lemma: string): Promise<LexiconEntry | null> {
  if (!lexicon) {
    const response = await fetch(new URL('lexicon.json', DATA));
    if (!response.ok) return null;
    lexicon = (await response.json()) as Record<string, Record<string, LexiconEntry>>;
  }
  return lexicon[edition]?.[entryOf(edition, lemma)] ?? null;
}

export async function wordsForBook(edition: EditionId, bookId: number): Promise<BookWords | null> {
  if (edition === 'kjv' || inDesktopApp()) return bookCache.get(`${edition}-${bookId}`) ?? null;

  const key = `${edition}-words-${bookId}`;
  const already = bookCache.get(key);
  if (already) return already;

  const response = await fetch(new URL(`${key}.json`, DATA));
  if (!response.ok) return null;
  const file = (await response.json()) as BookWords;
  bookCache.set(key, file);
  return file;
}

/**
 * The dictionary entry a word belongs to.
 *
 * A Hebrew lemma carries its prefixes, so the same word reads as "7225" in one verse
 * and "b/7225" in the next. Both are the same entry, and counting them apart made a
 * common word look rare.
 */
export function entryOf(edition: EditionId, lemma: string): string {
  if (edition !== 'hebrew') return lemma;
  return (lemma.split('/').pop() ?? lemma).replace(/\s+/g, '');
}

/** How often a dictionary entry occurs in the whole of its testament. */
export async function totalFor(edition: EditionId, lemma: string): Promise<number | null> {
  if (!totals) {
    const response = await fetch(new URL('word-totals.json', DATA));
    if (!response.ok) return null;
    totals = (await response.json()) as Record<string, Record<string, number>>;
  }
  return totals[edition]?.[entryOf(edition, lemma)] ?? null;
}

/** Every verse in a book where a dictionary form occurs. */
export function occurrencesIn(book: BookWords, edition: EditionId, lemma: string): string[] {
  const entry = entryOf(edition, lemma);
  const found: string[] = [];
  for (const [reference, words] of Object.entries(book)) {
    if (words.some((word) => entryOf(edition, word[1]) === entry)) found.push(reference);
  }
  return found.sort((a, b) => {
    const [ac, av] = a.split(':').map(Number);
    const [bc, bv] = b.split(':').map(Number);
    return ac - bc || av - bv;
  });
}

/**
 * The Hebrew lemma carries its prefixes, as in "b/7225", where the number is the
 * Strong's entry and the letter before it a prefix. The entry itself is what a reader
 * looks up.
 */
export function strongsOf(edition: EditionId, lemma: string): string | null {
  if (edition !== 'hebrew') return null;
  const entry = entryOf(edition, lemma);
  return /^\d/.test(entry) ? `H${entry}` : null;
}

const HEBREW_PARTS: Record<string, string> = {
  A: 'adjective',
  C: 'conjunction',
  D: 'adverb',
  N: 'noun',
  P: 'pronoun',
  R: 'preposition',
  S: 'suffix',
  T: 'particle',
  V: 'verb',
};

/**
 * Hebrew codes are read by position, not letter by letter.
 *
 * A noun is `N` then its type, gender, number and state, so the `c` in `Ncfsa` is
 * "common", and only the final letter says whether it is absolute or construct. Reading
 * every letter against one table made a noun come out "construct, feminine, singular,
 * absolute", which is two contradictory things at once.
 */
const HEBREW_NOUN_TYPES: Record<string, string> = {
  c: 'common',
  p: 'proper',
  g: 'gentilic',
};
const HEBREW_GENDERS: Record<string, string> = {
  m: 'masculine',
  f: 'feminine',
  b: 'common gender',
};
const HEBREW_NUMBERS: Record<string, string> = { s: 'singular', p: 'plural', d: 'dual' };
const HEBREW_STATES: Record<string, string> = {
  a: 'absolute',
  c: 'construct',
  d: 'determined',
};
const HEBREW_PERSONS: Record<string, string> = {
  '1': 'first person',
  '2': 'second person',
  '3': 'third person',
};

const HEBREW_STEMS: Record<string, string> = {
  q: 'qal',
  N: 'niphal',
  p: 'piel',
  P: 'pual',
  h: 'hiphil',
  H: 'hophal',
  t: 'hithpael',
  o: 'polel',
  O: 'polal',
  r: 'poel',
  v: 'hithpolel',
};

const HEBREW_TENSES: Record<string, string> = {
  p: 'perfect',
  q: 'sequential perfect',
  i: 'imperfect',
  w: 'sequential imperfect',
  h: 'cohortative',
  j: 'jussive',
  v: 'imperative',
  a: 'infinitive absolute',
  c: 'infinitive construct',
  r: 'active participle',
  s: 'passive participle',
};

const GREEK_PARTS: Record<string, string> = {
  'N-': 'noun',
  'A-': 'adjective',
  'V-': 'verb',
  'P-': 'pronoun',
  RA: 'article',
  RD: 'demonstrative',
  RI: 'interrogative',
  RP: 'personal pronoun',
  RR: 'relative pronoun',
  'C-': 'conjunction',
  'D-': 'adverb',
  'I-': 'interjection',
  'X-': 'particle',
  PREP: 'preposition',
};

const GREEK_CASES: Record<string, string> = {
  N: 'nominative',
  G: 'genitive',
  D: 'dative',
  A: 'accusative',
  V: 'vocative',
};
const GREEK_NUMBERS: Record<string, string> = { S: 'singular', P: 'plural' };
const GREEK_GENDERS: Record<string, string> = { M: 'masculine', F: 'feminine', N: 'neuter' };
const GREEK_TENSES: Record<string, string> = {
  P: 'present',
  I: 'imperfect',
  F: 'future',
  A: 'aorist',
  X: 'perfect',
  Y: 'pluperfect',
};
const GREEK_VOICES: Record<string, string> = { A: 'active', M: 'middle', P: 'passive' };
const GREEK_MOODS: Record<string, string> = {
  I: 'indicative',
  D: 'imperative',
  S: 'subjunctive',
  O: 'optative',
  N: 'infinitive',
  P: 'participle',
};

/**
 * Turns a parsing code into words.
 *
 * Returns an empty list where the code is not understood, and the caller shows the raw
 * code instead. A half-read code is worse than an unread one.
 */
export function parse(edition: EditionId, code: string): string[] {
  if (!code) return [];

  if (edition === 'hebrew') {
    // Codes open with H for Hebrew. Prefixes are divided by slashes; the last segment
    // is the word itself.
    const body = code.replace(/^H/, '').split('/').pop() ?? '';
    const part = HEBREW_PARTS[body[0]];
    if (!part) return [];

    const out = [part];

    if (part === 'verb') {
      const stem = HEBREW_STEMS[body[1]];
      const tense = HEBREW_TENSES[body[2]];
      if (stem) out.push(stem);
      if (tense) out.push(tense);

      const rest = body.slice(3);
      if (tense === 'active participle' || tense === 'passive participle') {
        // A participle is parsed like a noun from here on.
        if (HEBREW_GENDERS[rest[0]]) out.push(HEBREW_GENDERS[rest[0]]);
        if (HEBREW_NUMBERS[rest[1]]) out.push(HEBREW_NUMBERS[rest[1]]);
        if (HEBREW_STATES[rest[2]]) out.push(HEBREW_STATES[rest[2]]);
      } else {
        if (HEBREW_PERSONS[rest[0]]) out.push(HEBREW_PERSONS[rest[0]]);
        if (HEBREW_GENDERS[rest[1]]) out.push(HEBREW_GENDERS[rest[1]]);
        if (HEBREW_NUMBERS[rest[2]]) out.push(HEBREW_NUMBERS[rest[2]]);
      }
      return out;
    }

    if (part === 'noun' || part === 'adjective') {
      if (HEBREW_NOUN_TYPES[body[1]]) out.push(HEBREW_NOUN_TYPES[body[1]]);
      if (HEBREW_GENDERS[body[2]]) out.push(HEBREW_GENDERS[body[2]]);
      if (HEBREW_NUMBERS[body[3]]) out.push(HEBREW_NUMBERS[body[3]]);
      if (HEBREW_STATES[body[4]]) out.push(HEBREW_STATES[body[4]]);
      return out;
    }

    if (part === 'pronoun' || part === 'suffix') {
      if (HEBREW_PERSONS[body[2]]) out.push(HEBREW_PERSONS[body[2]]);
      if (HEBREW_GENDERS[body[3]]) out.push(HEBREW_GENDERS[body[3]]);
      if (HEBREW_NUMBERS[body[4]]) out.push(HEBREW_NUMBERS[body[4]]);
    }
    return out;
  }

  // Greek: a part of speech, then eight slots of parsing.
  const [pos, slots = ''] = code.split(/\s+/);
  const part = GREEK_PARTS[pos] ?? GREEK_PARTS[pos?.slice(0, 2)];
  if (!part) return [];

  const out = [part];
  const at = (index: number, table: Record<string, string>) => {
    const letter = slots[index];
    if (letter && letter !== '-') {
      const value = table[letter];
      if (value) out.push(value);
    }
  };

  at(0, HEBREW_PERSONS);
  at(1, GREEK_TENSES);
  at(2, GREEK_VOICES);
  at(3, GREEK_MOODS);
  at(4, GREEK_CASES);
  at(5, GREEK_NUMBERS);
  at(6, GREEK_GENDERS);
  return out;
}
