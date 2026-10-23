/**
 * The Hebrew and Greek lexicons.
 *
 * Word study could show that a word is H0430 without saying it means "God", which is
 * the part a reader actually wants. These give every dictionary entry a gloss and a
 * definition.
 *
 * Source: the Translators Brief lexicon of Extended Strongs, from STEPBible, under
 * CC BY. Attribution is required and is recorded in data/sources.json and shown in the
 * app.
 */

const BASE = 'https://raw.githubusercontent.com/tyndale/STEPBible-Data/master/Lexicons/';

export const HEBREW_LEXICON = `${BASE}TBESH%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Hebrew%20-%20STEPBible.org%20CC%20BY.txt`;
export const GREEK_LEXICON = `${BASE}TBESG%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Greek%20-%20STEPBible.org%20CC%20BY.txt`;

/** Strips the markup the definitions carry and trims them to something readable. */
function clean(text, limit = 420) {
  const plain = text
    .replace(/<ref=[^>]*>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= limit) return plain;
  // Cut at a sentence end where there is one nearby, so it does not stop mid-word.
  const cut = plain.slice(0, limit);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
  return (stop > limit * 0.6 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`).trim();
}

/** Accents and vowel points vary between sources, so matching ignores them. */
export function foldWord(word) {
  return word
    .normalize('NFD')
    .replace(/[̀-֑ͯ-ׇ]/g, '')
    .toLowerCase()
    .split(/[,\s]+/)[0];
}

/**
 * Reads one lexicon file.
 *
 * Returns entries keyed by Strong's number, and for Greek also by the headword, because
 * the Greek text gives a word as its lemma rather than a number.
 */
export function parseLexicon(text, prefix) {
  const byKey = new Map();
  const byWord = new Map();

  for (const line of text.split('\n')) {
    const columns = line.split('\t');
    if (columns.length < 7) continue;

    const base = columns[0].trim();
    if (!base.startsWith(prefix)) continue;

    const extended = (columns[1] ?? '').trim().split(/\s*=/)[0].trim();
    const word = (columns[3] ?? '').trim();
    const translit = (columns[4] ?? '').trim();
    const gloss = (columns[6] ?? '').trim();
    if (!gloss) continue;

    const entry = {
      w: word,
      t: translit,
      g: gloss,
      d: clean(columns[7] ?? ''),
    };

    // The first entry for a number is its main sense; later ones are compounds.
    if (!byKey.has(base)) byKey.set(base, entry);
    if (extended && !byKey.has(extended)) byKey.set(extended, entry);

    const folded = foldWord(word);
    if (folded && !byWord.has(folded)) byWord.set(folded, entry);
  }

  return { byKey, byWord };
}

/**
 * The lexicon key for a Hebrew dictionary entry.
 *
 * The Hebrew text gives entries as "430" or "1254a"; the lexicon writes them zero-padded
 * as H0430, with any disambiguating letter in capitals.
 */
export function hebrewKey(entry) {
  const match = /^(\d+)([a-z]?)$/.exec(entry);
  if (!match) return null;
  return `H${match[1].padStart(4, '0')}${match[2] ? match[2].toUpperCase() : ''}`;
}
