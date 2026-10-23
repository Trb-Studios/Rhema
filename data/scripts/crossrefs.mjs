/**
 * Cross-references: where else Scripture says this.
 *
 * The one thing a reader cannot do with a concordance is notice that a verse is being
 * quoted, echoed or answered somewhere else. This is the dataset from OpenBible, built
 * on the Treasury of Scripture Knowledge and ranked by how many readers thought each
 * link was a good one — so the strongest connections come first rather than an
 * alphabetical list.
 *
 * Source: openbible.info cross-references, CC BY, carried in scrollmapper's MIT-licensed
 * collection because openbible.info itself cannot be reached from the build. Attribution
 * is required and is shown in the app.
 */

export const CROSS_REFERENCES =
  'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/sources/extras/cross_references.txt';

/** The abbreviations this dataset uses, in canonical order. */
const BOOKS = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs',
  '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song',
  'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic',
  'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal',
  'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1Cor', '2Cor', 'Gal', 'Eph', 'Phil',
  'Col', '1Thess', '2Thess', '1Tim', '2Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1Pet',
  '2Pet', '1John', '2John', '3John', 'Jude', 'Rev',
];

const BOOK_ID = new Map(BOOKS.map((abbreviation, index) => [abbreviation, index + 1]));

/** "Gen.1.1" becomes { bookId, chapter, verse }. */
export function parseVerse(ref) {
  const match = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/.exec((ref ?? '').trim());
  if (!match) return null;
  const bookId = BOOK_ID.get(match[1]);
  if (!bookId) return null;
  return { bookId, chapter: Number(match[2]), verse: Number(match[3]) };
}

/**
 * The target of a reference, which may be a run of verses.
 *
 * "Prov.8.22-Prov.8.30" is one link to nine verses, not nine links. A run that crosses
 * a chapter is kept as its opening verse, since the reader is being sent to a passage
 * and the opening is where they should start.
 */
export function parseTarget(ref) {
  const [from, to] = (ref ?? '').split('-');
  const start = parseVerse(from);
  if (!start) return null;

  const end = to ? parseVerse(to) : null;
  const last =
    end && end.bookId === start.bookId && end.chapter === start.chapter
      ? Math.max(start.verse, end.verse)
      : start.verse;

  return { ...start, last };
}

/**
 * Reads the file into references, strongest first.
 *
 * `perVerse` caps how many are kept for one verse. The dataset holds 344,000 links, many
 * of them with a single vote or a negative score, and a verse offering forty references
 * is no more useful than one offering eight — it is less, because the reader has to
 * judge them all. Only links readers voted up are kept.
 */
export function parseCrossRefs(text, perVerse = 8) {
  const byVerse = new Map();

  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('From Verse')) continue;

    const columns = line.split('\t');
    if (columns.length < 2) continue;

    const from = parseVerse(columns[0]);
    const to = parseTarget(columns[1]);
    if (!from || !to) continue;

    const votes = Number.parseInt(columns[2] ?? '0', 10);
    if (!Number.isFinite(votes) || votes <= 0) continue;

    // A verse pointing at itself helps nobody.
    if (from.bookId === to.bookId && from.chapter === to.chapter && from.verse === to.verse) {
      continue;
    }

    const key = `${from.bookId}:${from.chapter}:${from.verse}`;
    const list = byVerse.get(key) ?? [];
    list.push({ from, to, votes });
    byVerse.set(key, list);
  }

  const out = [];
  for (const list of byVerse.values()) {
    list.sort((a, b) => b.votes - a.votes);
    for (const link of list.slice(0, perVerse)) out.push(link);
  }

  return out;
}
