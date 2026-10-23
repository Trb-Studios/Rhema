/**
 * The Hebrew and Greek texts.
 *
 * These are whole editions in their own right, not a gloss laid over the English. The
 * reader switches to one and reads it; the English is never replaced word by word.
 *
 * Hebrew: the Westminster Leningrad Codex, from Open Scriptures, as OSIS XML with every
 * word carrying its lemma and morphology.
 * Greek: the SBL Greek New Testament, from MorphGNT, one word per line with its parsing
 * and dictionary form.
 *
 * Versification follows each edition, which is not always the KJV's. The Hebrew counts
 * a psalm's title as verse 1 where the KJV does not, so some psalms are numbered one
 * ahead. The reader shows each edition as its own tradition numbers it rather than
 * forcing one onto the other.
 */

const WLC = 'https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/';
const GNT = 'https://raw.githubusercontent.com/morphgnt/sblgnt/master/';

/** Open Scriptures file names, in canonical order. These are the 39 books of the OT. */
export const HEBREW_BOOKS = [
  'Gen',
  'Exod',
  'Lev',
  'Num',
  'Deut',
  'Josh',
  'Judg',
  'Ruth',
  '1Sam',
  '2Sam',
  '1Kgs',
  '2Kgs',
  '1Chr',
  '2Chr',
  'Ezra',
  'Neh',
  'Esth',
  'Job',
  'Ps',
  'Prov',
  'Eccl',
  'Song',
  'Isa',
  'Jer',
  'Lam',
  'Ezek',
  'Dan',
  'Hos',
  'Joel',
  'Amos',
  'Obad',
  'Jonah',
  'Mic',
  'Nah',
  'Hab',
  'Zeph',
  'Hag',
  'Zech',
  'Mal',
];

/** MorphGNT file stems, in canonical order. These are the 27 books of the NT. */
export const GREEK_BOOKS = [
  '61-Mt',
  '62-Mk',
  '63-Lk',
  '64-Jn',
  '65-Ac',
  '66-Ro',
  '67-1Co',
  '68-2Co',
  '69-Ga',
  '70-Eph',
  '71-Php',
  '72-Col',
  '73-1Th',
  '74-2Th',
  '75-1Ti',
  '76-2Ti',
  '77-Tit',
  '78-Phm',
  '79-Heb',
  '80-Jas',
  '81-1Pe',
  '82-2Pe',
  '83-1Jn',
  '84-2Jn',
  '85-3Jn',
  '86-Jud',
  '87-Re',
];

export const hebrewUrl = (stem) => `${WLC}${stem}.xml`;
export const greekUrl = (stem) => `${GNT}${stem}-morphgnt.txt`;

/**
 * Pulls the verses out of one WLC book.
 *
 * A word may be written with `/` separating its prefixes from its stem, which is
 * scholarly markup rather than how the word is written. It is kept per word, so the
 * reader can show the parts, and stripped from the running text.
 */
export function parseHebrew(xml) {
  const verses = [];
  const versePattern = /<verse osisID="([^"]+)">([\s\S]*?)<\/verse>/g;
  const wordPattern = /<w\b([^>]*)>([\s\S]*?)<\/w>/g;

  for (let verseMatch = versePattern.exec(xml); verseMatch; verseMatch = versePattern.exec(xml)) {
    const [, osisId, body] = verseMatch;
    const [, chapter, verse] = osisId.split('.');

    const words = [];
    wordPattern.lastIndex = 0;
    let wordMatch = wordPattern.exec(body);
    while (wordMatch) {
      const [, attributes, raw] = wordMatch;
      const written = raw.replace(/<[^>]*>/g, '').trim();
      if (written) {
        words.push({
          w: written.replace(/\//g, ''),
          // The lemma carries the Strong's number, which the word study will want.
          l: /lemma="([^"]*)"/.exec(attributes)?.[1] ?? '',
          m: /morph="([^"]*)"/.exec(attributes)?.[1] ?? '',
        });
      }
      wordMatch = wordPattern.exec(body);
    }

    if (words.length > 0) {
      verses.push({
        chapter: Number(chapter),
        verse: Number(verse),
        text: words.map((word) => word.w).join(' '),
        words,
      });
    }
  }
  return verses;
}

/**
 * Pulls the verses out of one MorphGNT book.
 *
 * Each line is one word: a six-digit book-chapter-verse code, the part of speech, the
 * parsing, the word as printed, the word without punctuation, its normalised form, and
 * its dictionary form.
 */
export function parseGreek(text) {
  const byVerse = new Map();

  for (const line of text.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 7) continue;

    const [code, pos, parsing, printed, , , lemma] = parts;
    const chapter = Number(code.slice(2, 4));
    const verse = Number(code.slice(4, 6));
    if (!chapter || !verse) continue;

    const key = `${chapter}:${verse}`;
    if (!byVerse.has(key)) byVerse.set(key, { chapter, verse, words: [] });
    byVerse.get(key).words.push({ w: printed, l: lemma, m: `${pos} ${parsing}` });
  }

  return [...byVerse.values()]
    .sort((a, b) => a.chapter - b.chapter || a.verse - b.verse)
    .map((entry) => ({ ...entry, text: entry.words.map((word) => word.w).join(' ') }));
}
