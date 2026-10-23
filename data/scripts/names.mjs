/**
 * Every person and place in the Bible, as individuals rather than as words.
 *
 * The starter set this replaces held 74 people and 43 places, written by hand, and
 * deliberately left out every name borne by more than one person — because marking all
 * the Marys alike would have been worse than not marking them. This dataset solves that
 * properly: it identifies individuals, not names. Mary the mother of Jesus and Mary
 * Magdalene are separate people with separate lists of the verses they appear in, so the
 * reader can mark the right one in the right place.
 *
 * It also carries parents, siblings, partners and offspring, which is the genealogy the
 * app was asked for on the first day.
 *
 * Source: TIPNR, the Translators Individualised Proper Names with all References, from
 * STEPBible and Tyndale House Cambridge, under CC BY 4.0. Their licence asks that copies
 * of the file not be posted elsewhere, so it is downloaded at build time and only the
 * data this app needs is derived from it. Attribution is required and is shown in the
 * app.
 */

export const TIPNR =
  'https://raw.githubusercontent.com/tyndale/STEPBible-Data/master/Proper%20Nouns/' +
  'TIPNR%20-%20Translators%20Individualised%20Proper%20Names%20with%20all%20References%20-%20STEPBible.org%20CC%20BY.txt';

/** TIPNR's book abbreviations, in canonical order, as this app numbers its books. */
const BOOKS = [
  'Gen', 'Exo', 'Lev', 'Num', 'Deu', 'Jos', 'Jdg', 'Rut', '1Sa', '2Sa', '1Ki', '2Ki',
  '1Ch', '2Ch', 'Ezr', 'Neh', 'Est', 'Job', 'Psa', 'Pro', 'Ecc', 'Sng', 'Isa', 'Jer',
  'Lam', 'Ezk', 'Dan', 'Hos', 'Jol', 'Amo', 'Oba', 'Jon', 'Mic', 'Nam', 'Hab', 'Zep',
  'Hag', 'Zec', 'Mal',
  'Mat', 'Mrk', 'Luk', 'Jhn', 'Act', 'Rom', '1Co', '2Co', 'Gal', 'Eph', 'Php', 'Col',
  '1Th', '2Th', '1Ti', '2Ti', 'Tit', 'Phm', 'Heb', 'Jas', '1Pe', '2Pe', '1Jn', '2Jn',
  '3Jn', 'Jud', 'Rev',
];

const BOOK_ID = new Map(BOOKS.map((abbreviation, index) => [abbreviation, index + 1]));
// Two spellings appear a handful of times each; 1Cl is 1 Clement, which is not Scripture.
BOOK_ID.set('Jam', BOOK_ID.get('Jas'));
BOOK_ID.set('Ezra', BOOK_ID.get('Ezr'));

/**
 * The one-line description, from the structured fields.
 *
 * TIPNR's summary column opens with a sentence built from the data — who someone was,
 * when they lived — and then lists every spelling of the name with its Hebrew or Greek.
 * The app has the spellings already, so only the first sentence is kept.
 *
 * The file also carries longer descriptions under @Brief, @Short and @Article, which its
 * own header says were written by an AI in April 2024 and then adapted. Those are left
 * out deliberately: someone studying Scripture should not be shown a machine's prose
 * about a person as though it were the scholarship, and this app cannot check it.
 */
function clean(text, limit = 220) {
  let plain = (text ?? '')
    .replace(/^#/, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Everything from "first mentioned at" onwards is the list of forms and references.
  plain = plain.replace(/,?\s*(?:first|only) mentioned at.*$/i, '');
  plain = plain.replace(/[\s,;(]+$/, '');
  if (plain && !/[.!?]$/.test(plain)) plain += '.';

  if (plain.length <= limit) return plain;
  const cut = plain.slice(0, limit);
  const stop = cut.lastIndexOf('. ');
  return stop > limit * 0.5 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`;
}

/** The identifier without its Strong's number: "Aaron@Exo.4.14-Heb". */
function idOf(cell) {
  return (cell ?? '').split('=')[0].trim();
}

/** The name a reader would say: the part before the "@". */
function nameOf(id) {
  const name = id.split('@')[0].trim();
  // A few entries combine two names with a bar, as in "Ham|Ammon".
  return name.split('|').pop() ?? name;
}

function listOf(cell) {
  return (cell ?? '')
    .split(/[,+]/)
    .map((part) => idOf(part))
    .filter((part) => part && part !== '>' && part.includes('@'));
}

/**
 * Every way a single written form might appear in the text.
 *
 * TIPNR writes a form with the parts that are optional in brackets and alternatives
 * separated by slashes: "(Mount )Sinai" is both "Mount Sinai" and "Sinai", "Red (Sea)"
 * is both, and "desert of/ Sinai/wilderness of/ Sinai" is two phrases interleaved.
 * Every reading is produced and the build keeps whichever ones are really in the verse.
 */
export function expandForm(form) {
  const out = new Set();
  const tidy = (value) => value.replace(/\s+/g, ' ').trim();

  const withBrackets = (value) => {
    if (!value.includes('(')) return [value];
    // Both readings: with the bracketed words and without them.
    return [tidy(value.replace(/[()]/g, '')), tidy(value.replace(/\([^)]*\)/g, ''))];
  };

  const pieces = form.includes('/')
    ? (() => {
        const parts = form.split('/').map(tidy).filter(Boolean);
        // The parts alone, and each joined to the one after it, which is how a phrase
        // split across slashes reads back.
        const joined = parts.slice(0, -1).map((part, index) => `${part} ${parts[index + 1]}`);
        return [...parts, ...joined];
      })()
    : [form];

  for (const piece of pieces) {
    for (const reading of withBrackets(piece)) {
      const value = tidy(reading);
      if (!value || !/[A-Za-z]/.test(value)) continue;
      out.add(value);
      // The King James runs compound names together where modern versions hyphenate
      // them: Baal-zephon is printed Baalzephon, Pi-hahiroth as Pihahiroth.
      if (value.includes('-')) {
        out.add(value.replace(/-/g, ''));
        out.add(value.replace(/-/g, ' '));
      }
    }
  }

  return [...out];
}

/**
 * The forms of a name as the King James prints them.
 *
 * TIPNR gives forms as "Abijah =ESV,NIV; Abiah =KJV". Since this app reads the KJV, the
 * KJV form is the one that will actually appear in the text; where the versions agree,
 * no version is named and every form applies.
 */
export function kjvForms(cell) {
  const field = (cell ?? '').trim();
  if (!field) return [];

  const parts = field.split(';').map((part) => part.trim()).filter(Boolean);
  const withVersions = [];
  const plain = [];

  for (const part of parts) {
    const [names, versions] = part.split('=').map((piece) => (piece ?? '').trim());
    if (!names) continue;
    // One field can hold several forms of the same name, as "Israel,Israelite". The
    // commas after an "=" belong to the list of versions, not to the names.
    for (const form of names.split(',')) {
      const trimmed = form.trim();
      if (!trimmed) continue;
      if (versions) withVersions.push([trimmed, versions]);
      else plain.push(trimmed);
    }
  }

  const kjv = withVersions
    .filter(([, versions]) => /\bKJV\b/.test(versions))
    .map(([form]) => form);

  const forms = kjv.length > 0 ? kjv : [...plain, ...withVersions.map(([form]) => form)];
  return [
    ...new Set(
      forms
        // "[ ]" marks a place in the text where the individual is meant but not named.
        .filter((form) => form && !form.trim().startsWith('['))
        .flatMap(expandForm),
    ),
  ];
}

/** "Exo.4.14" and "Exo.7.10a" alike become { bookId, chapter, verse }. */
export function parseRef(ref) {
  const trimmed = (ref ?? '').trim();
  if (!trimmed || /^LXX/i.test(trimmed)) return null;
  const match = /^([1-4]?[A-Za-z]{2,4})\.(\d+)\.(\d+)/.exec(trimmed);
  if (!match) return null;
  const bookId = BOOK_ID.get(match[1]);
  if (!bookId) return null;
  return { bookId, chapter: Number(match[2]), verse: Number(match[3]) };
}

/**
 * Reads the whole file into individuals and their occurrences.
 *
 * Returns `subjects` keyed by identifier, and `marks` as bookId → "chapter:verse" →
 * [[form, id], …], which is what the reader needs to mark the right individual in the
 * right verse.
 */
export function parseNames(text) {
  const lines = text.split(/\r?\n/);
  const subjects = new Map();
  const marks = new Map();

  let kind = null;
  let current = null;

  const finish = () => {
    if (current && current.id) subjects.set(current.id, current);
    current = null;
  };

  for (const line of lines) {
    if (line.startsWith('$=')) {
      finish();
      const match = /^\$=+ ?(PERSON\(s\)|PLACE|OTHER)/.exec(line);
      kind = match ? (match[1] === 'PERSON(s)' ? 'person' : match[1].toLowerCase()) : null;
      current = kind ? { pending: true } : null;
      continue;
    }
    if (!current || !kind) continue;

    const columns = line.split('\t');

    // The header line of a record, which is the first ordinary line after the marker.
    if (current.pending) {
      if (!line.trim()) continue;
      if (line.startsWith('–') || line.startsWith('@')) continue;
      // The template rows that describe the columns are not records.
      if (/^Un(ified|ique)Name/.test(line)) {
        current = null;
        continue;
      }

      const id = idOf(columns[0]);
      if (!id.includes('@')) {
        current = null;
        continue;
      }

      current = {
        pending: false,
        id,
        kind,
        name: nameOf(id),
        type: (columns[8] ?? '').trim(),
        summary: clean(columns[7]),
        detail: (columns[1] ?? '').trim(),
        parents: kind === 'person' ? listOf(columns[2]) : [],
        siblings: kind === 'person' ? listOf(columns[3]) : [],
        partners: kind === 'person' ? listOf(columns[4]) : [],
        children: kind === 'person' ? listOf(columns[5]) : [],
        tribe: kind === 'person' ? (columns[6] ?? '').trim().replace(/^>$/, '') : '',
        near: kind === 'place' ? (columns[1] ?? '').trim() : '',
        area: kind === 'place' ? (columns[6] ?? '').trim().replace(/^>$/, '') : '',
        forms: new Set(),
        refs: 0,
      };
      continue;
    }

    if (line.startsWith('@')) continue;
    if (!line.startsWith('–')) continue;

    const significance = (columns[0] ?? '').replace(/^–\s*/, '').trim();
    if (!significance || significance === 'Total') continue;

    const forms = kjvForms(columns[3]);
    if (forms.length === 0) continue;

    for (const ref of (columns[4] ?? '').split(';')) {
      const place = parseRef(ref);
      if (!place) continue;

      let book = marks.get(place.bookId);
      if (!book) {
        book = new Map();
        marks.set(place.bookId, book);
      }
      const key = `${place.chapter}:${place.verse}`;
      const at = book.get(key) ?? [];

      for (const form of forms) {
        if (!at.some(([existing, id]) => existing === form && id === current.id)) {
          at.push([form, current.id]);
        }
        current.forms.add(form);
      }
      book.set(key, at);
      current.refs += 1;
    }
  }

  finish();
  return { subjects, marks };
}
