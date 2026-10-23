/**
 * The letters standing over the sections of Psalm 119.
 *
 * Psalm 119 is an acrostic: its 176 verses fall into 22 sections of eight, and every
 * verse of a section opens with the same Hebrew letter, in alphabetical order. The KJV
 * prints the letter and its name above each section, and without them the psalm reads
 * as 176 unrelated lines rather than the deliberate structure it is.
 *
 * Printings differ in where they put it. Some fold the letter into the first verse, so
 * it reads as "א ALEPH. Blessed are the undefiled..."; the edition used here
 * leaves it out altogether. Either way the heading belongs beside the verse rather than
 * inside it, so it is carried as data here, and the name is spelled as the KJV spells
 * it — VAU, JOD, SCHIN, not the modern vav, yod, shin.
 *
 * The table is checked against the Hebrew: every one of the 176 verses in the
 * Westminster Leningrad Codex begins with the letter claimed for it here.
 */

/** The Hebrew alphabet in order, with the names the KJV gives them. */
export const ACROSTIC_LETTERS = [
  ['א', 'ALEPH'],
  ['ב', 'BETH'],
  ['ג', 'GIMEL'],
  ['ד', 'DALETH'],
  ['ה', 'HE'],
  ['ו', 'VAU'],
  ['ז', 'ZAIN'],
  ['ח', 'CHETH'],
  ['ט', 'TETH'],
  ['י', 'JOD'],
  ['כ', 'CAPH'],
  ['ל', 'LAMED'],
  ['מ', 'MEM'],
  ['נ', 'NUN'],
  ['ס', 'SAMECH'],
  ['ע', 'AIN'],
  ['פ', 'PE'],
  ['צ', 'TZADDI'],
  ['ק', 'KOPH'],
  ['ר', 'RESH'],
  ['ש', 'SCHIN'],
  ['ת', 'TAU'],
];

/** Verse number to heading, for Psalm 119. Section n opens at verse 8(n-1)+1. */
export const PSALM_119_HEADINGS = new Map(
  ACROSTIC_LETTERS.map(([letter, name], index) => [index * 8 + 1, `${letter} ${name}`]),
);

/** A heading some printings fold into the verse, so it is never shown twice. */
const INLINE = /^([֐-׿]+)\s+([A-Z]+)\.\s+/;

/**
 * Separates a section heading from the words of the verse.
 *
 * The heading is taken from the table where one belongs, so the psalm is set the same
 * way whichever edition the text came from; an inline one is stripped either way.
 */
export function splitHeading(bookName, chapter, verse, text) {
  const inline = INLINE.exec(text);
  const body = inline ? text.slice(inline[0].length) : text;

  if (bookName === 'Psalms' && chapter === 119) {
    return { heading: PSALM_119_HEADINGS.get(verse) ?? null, text: body };
  }
  return { heading: inline ? `${inline[1]} ${inline[2]}` : null, text: body };
}
