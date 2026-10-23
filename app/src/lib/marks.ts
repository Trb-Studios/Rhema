/**
 * Finding people and places inside a verse.
 *
 * The dataset is deliberately unambiguous: a name that belongs to several different
 * people, such as John or Mary, is left out rather than marked as though every
 * occurrence were the same person. Better no mark than a wrong one.
 */

import data from '../data/people-places.json';

export type Subject = {
  kind: 'person' | 'place';
  name: string;
  also?: string;
  meaning?: string;
  modern?: string;
  note: string;
};

export const SUBJECTS: Subject[] = [
  ...data.people.map((person) => ({ ...person, kind: 'person' as const })),
  ...data.places.map((place) => ({ ...place, kind: 'place' as const })),
];

const BY_NAME = new Map(SUBJECTS.map((subject) => [subject.name, subject]));

/**
 * One expression covering every name, longest first so "Abraham" is preferred over any
 * shorter name it contains. Word boundaries keep "Adam" out of "Adamah".
 */
const PATTERN = new RegExp(
  `\\b(${SUBJECTS.map((s) => s.name)
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
    if (subject) {
      pieces.push({ type: 'mark', text: match[0], subject });
    } else {
      pieces.push({ type: 'text', text: match[0] });
    }

    index = match.index + match[0].length;
    match = PATTERN.exec(text);
  }

  if (index < text.length) pieces.push({ type: 'text', text: text.slice(index) });
  return pieces;
}
