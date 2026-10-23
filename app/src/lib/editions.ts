/**
 * The editions a chapter can be read in.
 *
 * Hebrew and Greek are whole editions, not a gloss laid over the English. Switching to
 * one replaces the page with that text, read as its own tradition writes and numbers it.
 * The Hebrew covers the Old Testament, the Greek the New, so which are offered depends
 * on the book in front of you.
 */

export type EditionId = 'kjv' | 'hebrew' | 'greek';

export type Edition = {
  id: EditionId;
  /** What the switcher shows. */
  label: string;
  /** The full name, for the line under the chapter heading. */
  title: string;
  /** Which half of the Bible this edition covers. */
  covers: 'OT' | 'NT' | 'all';
  direction: 'ltr' | 'rtl';
  /** The CSS custom property holding this edition's typeface. */
  font: string;
  /** Said once, where the edition differs from the English in a way worth knowing. */
  caveat?: string;
};

export const EDITIONS: Edition[] = [
  {
    id: 'kjv',
    label: 'English',
    title: 'King James Version',
    covers: 'all',
    direction: 'ltr',
    font: 'var(--font-display)',
  },
  {
    id: 'hebrew',
    label: 'עברית',
    title: 'Westminster Leningrad Codex',
    covers: 'OT',
    direction: 'rtl',
    font: 'var(--font-hebrew)',
    caveat:
      'The Hebrew counts a psalm’s title as a verse where the King James does not, so some psalms are numbered a verse ahead.',
  },
  {
    id: 'greek',
    label: 'Ἑλληνικά',
    title: 'SBL Greek New Testament',
    covers: 'NT',
    direction: 'ltr',
    font: 'var(--font-greek)',
    caveat:
      'This Greek text rests on a different manuscript base from the one behind the King James, so a few verses the King James carries are absent here.',
  },
];

export function editionById(id: EditionId): Edition {
  return EDITIONS.find((edition) => edition.id === id) ?? EDITIONS[0];
}

/** The editions that can be read for a given book. English is always among them. */
export function editionsFor(testament: 'OT' | 'NT'): Edition[] {
  return EDITIONS.filter((edition) => edition.covers === 'all' || edition.covers === testament);
}
