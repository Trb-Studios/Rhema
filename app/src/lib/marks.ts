/**
 * Finding people and places inside a verse.
 *
 * Most names belong to one person and are simply marked. Names like Mary, Simon, and
 * Saul belong to several, so each of those carries a list of senses scoped to the books
 * and chapters where that person appears. A verse inside exactly one scope is matched to
 * that person; where scopes overlap or none fit, every possibility is offered and the
 * card says which it cannot tell apart. The one thing never done is picking a person the
 * text does not support.
 */

import data from '../data/people-places.json';

export type Sense = {
  who: string;
  note: string;
  /** Books, and where it narrows things, chapter ranges, in which this person appears. */
  where: Array<[book: string, from: number, to: number]>;
};

export type Subject = {
  kind: 'person' | 'place';
  name: string;
  also?: string;
  meaning?: string;
  modern?: string;
  note?: string;
  /** Set when the name belongs to more than one person. */
  senses?: Sense[];
};

/** Where in Scripture a mark was found, used to tell one Mary from another. */
export type Context = { book: string; chapter: number };

const PEOPLE: Subject[] = data.people.map((person) => ({ ...person, kind: 'person' as const }));
const PLACES: Subject[] = data.places.map((place) => ({ ...place, kind: 'place' as const }));
const AMBIGUOUS: Subject[] = data.ambiguous.map((entry) => ({
  ...entry,
  kind: 'person' as const,
  senses: entry.senses as Sense[],
}));

export const SUBJECTS: Subject[] = [...PEOPLE, ...PLACES, ...AMBIGUOUS];

const BY_NAME = new Map(SUBJECTS.map((subject) => [subject.name, subject]));

/**
 * One expression covering every name, longest first so "Abraham" is preferred over any
 * shorter name inside it. Word boundaries keep "Adam" out of "Adamah".
 */
const PATTERN = new RegExp(
  `\\b(${SUBJECTS.map((subject) => subject.name)
    .sort((a, b) => b.length - a.length)
    .join('|')})\\b`,
  'g',
);

export type Piece =
  { type: 'text'; text: string } | { type: 'mark'; text: string; subject: Subject };

/** Splits a verse into plain runs and marked names, in order. */
export function markUp(text: string): Piece[] {
  const pieces: Piece[] = [];
  let index = 0;

  PATTERN.lastIndex = 0;
  let match = PATTERN.exec(text);

  while (match) {
    if (match.index > index) {
      pieces.push({ type: 'text', text: text.slice(index, match.index) });
    }

    const subject = BY_NAME.get(match[0]);
    pieces.push(
      subject ? { type: 'mark', text: match[0], subject } : { type: 'text', text: match[0] },
    );

    index = match.index + match[0].length;
    match = PATTERN.exec(text);
  }

  if (index < text.length) pieces.push({ type: 'text', text: text.slice(index) });
  return pieces;
}

export type Resolved = {
  /** The senses this verse could mean, best first. */
  candidates: Sense[];
  /** True when exactly one person fits, so the card can name them plainly. */
  certain: boolean;
};

/**
 * Works out which bearer of a shared name a verse means.
 *
 * A sense scoped to this book and chapter is a direct fit. If only one fits, that is the
 * person. If several fit, or none do, all are returned and the caller says so.
 */
export function resolve(subject: Subject, at: Context): Resolved | null {
  if (!subject.senses) return null;

  const fits = subject.senses.filter((sense) =>
    sense.where.some(
      ([book, from, to]) => book === at.book && at.chapter >= from && at.chapter <= to,
    ),
  );

  if (fits.length === 1) return { candidates: fits, certain: true };
  if (fits.length > 1) return { candidates: fits, certain: false };
  return { candidates: subject.senses, certain: false };
}
