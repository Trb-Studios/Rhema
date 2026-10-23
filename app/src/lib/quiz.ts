/**
 * A quiz over a whole book.
 *
 * Built from the text itself rather than from a model. That is partly practical — there
 * is no server yet to hold an API key — but mostly right: a question generated from the
 * actual words cannot invent a verse, attribute a saying to the wrong person, or quietly
 * teach something the book does not say. Every answer here is checkable against the page
 * it came from, and the quiz says where.
 *
 * Three kinds of question, each testing something different:
 *
 * - **The missing word** asks whether the wording is known, not merely the gist.
 * - **Where it comes from** asks whether the shape of the book is known — roughly where
 *   in it a thing happens.
 * - **Who and where** asks after the people and places, which is the thing a reader
 *   most often cannot keep straight.
 */

import type { Book } from './bible';
import { wholeBook } from './bible';
import { marksFor } from './marks';

export type Question = {
  kind: 'missing-word' | 'where-from' | 'who-and-where';
  /** What is asked, with the verse or prompt. */
  prompt: string;
  /** The verse it came from, so a wrong answer can be looked up. */
  reference: { bookId: number; book: string; chapter: number; verse: number };
  options: string[];
  answer: number;
  /** Shown after answering. */
  note: string;
};

type Verse = { chapter: number; verse: number; text: string };

/**
 * Words too common to ask about.
 *
 * Blanking "the" tests nothing. This is the KJV's own high-frequency vocabulary, which
 * includes its pronouns and verb forms, so it is longer than a modern stop list.
 */
const COMMON = new Set(
  `the and of to that in he shall unto for i his a they be is was him them it with all thou
   thy thee ye not which are me my we she her you their there this but have had hath which
   when then than so as at from by up out on if no nor or any one two three what who whom
   whose how where were been being am art hast doth did do done shalt should would could
   also upon into before after against because while until these those such own same other
   another each every both few more most some many much very own said saith say says saying
   came come cometh went go goeth made make maketh took take taketh gave give giveth
   let thus therefore behold lo now here yet even still again away back down over under
   through among between about around off out`
    .split(/\s+/)
    .filter(Boolean),
);

/** Strips punctuation so a word can be compared and blanked cleanly. */
function bare(word: string): string {
  return word.replace(/[^A-Za-z']/g, '').toLowerCase();
}

/** The word as it is printed, without the punctuation around it. */
function surface(word: string): string {
  return word.replace(/^[^A-Za-z']+/, '').replace(/[^A-Za-z']+$/, '');
}

/**
 * A small deterministic random number generator.
 *
 * Seeded, so a quiz can be repeated exactly — useful for showing the same questions to
 * someone twice, and for tests that would otherwise be impossible to write.
 */
export function rng(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4_294_967_296;
  };
}

function pick<T>(items: T[], next: () => number): T {
  return items[Math.floor(next() * items.length)];
}

function shuffle<T>(items: T[], next: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Verses long enough to ask about and short enough to read in a question. */
function askable(verses: Verse[]): Verse[] {
  return verses.filter((verse) => {
    const words = verse.text.split(/\s+/).length;
    return words >= 9 && words <= 34;
  });
}

/**
 * How often each word occurs, and how it is printed.
 *
 * The printed form matters: options drawn from a lowercased key offered "jesus" and
 * "pilate", which both gives the proper nouns away and reads as though the app does not
 * know the names. Each word keeps whichever capitalisation it most often has in the
 * book, so Jordan is Jordan and waters is waters.
 */
function vocabularyOf(verses: Verse[]): {
  counts: Map<string, number>;
  display: Map<string, string>;
} {
  const counts = new Map<string, number>();
  const forms = new Map<string, Map<string, number>>();

  for (const verse of verses) {
    for (const word of verse.text.split(/\s+/)) {
      const key = bare(word);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);

      const printed = surface(word);
      if (!printed) continue;
      const seen = forms.get(key) ?? new Map<string, number>();
      seen.set(printed, (seen.get(printed) ?? 0) + 1);
      forms.set(key, seen);
    }
  }

  const display = new Map<string, string>();
  for (const [key, seen] of forms) {
    let best = key;
    let most = -1;
    for (const [form, times] of seen) {
      // Ties go to the lower-case form, since a word is capitalised at the start of a
      // sentence whether or not it is a name.
      if (times > most || (times === most && form < best)) {
        best = form;
        most = times;
      }
    }
    display.set(key, best);
  }

  return { counts, display };
}

function missingWord(
  book: Book,
  verses: Verse[],
  counts: Map<string, number>,
  display: Map<string, string>,
  vocabulary: string[],
  next: () => number,
): Question | null {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const verse = pick(verses, next);
    const words = verse.text.split(/\s+/);

    // A word worth asking about: long enough to carry meaning, not one of the book's
    // most common, and not so rare it is a proper name nobody could infer.
    const inVerse = new Map<string, number>();
    for (const word of words) {
      const key = bare(word);
      if (key) inVerse.set(key, (inVerse.get(key) ?? 0) + 1);
    }

    const candidates = words
      .map((word, index) => ({ word, index, key: bare(word) }))
      .filter(({ key }) => {
        const count = counts.get(key) ?? 0;
        if (key.length < 4 || COMMON.has(key)) return false;
        // A word that occurs twice in the verse would be blanked once and printed the
        // other time, which hands over the answer.
        if ((inVerse.get(key) ?? 0) !== 1) return false;
        return count >= 2 && count <= 60;
      });

    if (candidates.length === 0) continue;
    const chosen = pick(candidates, next);

    // Distractors come from the same book and are of similar length, so the answer
    // cannot be spotted by its shape alone.
    const others = vocabulary.filter(
      (word) =>
        word !== chosen.key &&
        Math.abs(word.length - chosen.key.length) <= 2 &&
        !words.some((inVerse) => bare(inVerse) === word),
    );
    if (others.length < 3) continue;

    const printed = (key: string) => display.get(key) ?? key;
    const distractors = shuffle(others, next)
      .map(printed)
      .filter((word, index, all) => all.indexOf(word) === index)
      .slice(0, 3);
    if (distractors.length < 3) continue;

    const answer = printed(chosen.key);
    if (distractors.includes(answer)) continue;
    const options = shuffle([answer, ...distractors], next);
    const blanked = words.map((word, index) => (index === chosen.index ? '————' : word)).join(' ');

    return {
      kind: 'missing-word',
      prompt: blanked,
      reference: { bookId: book.id, book: book.name, chapter: verse.chapter, verse: verse.verse },
      options,
      answer: options.indexOf(answer),
      note: `${book.name} ${verse.chapter}:${verse.verse} — ${verse.text}`,
    };
  }
  return null;
}

function whereFrom(book: Book, verses: Verse[], next: () => number): Question | null {
  if (book.chapters < 4) return null;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const verse = pick(verses, next);

    // Always four bands, split as evenly as the book allows. Stepping by a fixed size
    // gave three bands for a book of five chapters, and a question with three options
    // where every other question has four.
    const edges = [0, 1, 2, 3, 4].map((quarter) => Math.round((book.chapters * quarter) / 4));
    const bands: Array<[number, number]> = [];
    for (let i = 0; i < 4; i += 1) bands.push([edges[i] + 1, edges[i + 1]]);
    if (bands.some(([from, to]) => from > to)) return null;

    const label = ([from, to]: [number, number]) =>
      from === to ? `Chapter ${from}` : `Chapters ${from}–${to}`;

    const correct = bands.find(([from, to]) => verse.chapter >= from && verse.chapter <= to);
    if (!correct) continue;

    const options = bands.map(label);
    return {
      kind: 'where-from',
      prompt: verse.text,
      reference: { bookId: book.id, book: book.name, chapter: verse.chapter, verse: verse.verse },
      options,
      answer: options.indexOf(label(correct)),
      note: `${book.name} ${verse.chapter}:${verse.verse}.`,
    };
  }
  return null;
}

/**
 * Well-known names, for the wrong answers.
 *
 * The right answer comes from the book itself, so it is always genuinely there. The
 * wrong answers have to be names a reader would recognise — offering an obscure one
 * gives the question away — and each is checked against the book before it is used.
 */
const FAMILIAR = [
  'Abraham',
  'Isaac',
  'Jacob',
  'Joseph',
  'Moses',
  'Aaron',
  'Joshua',
  'Samuel',
  'Saul',
  'David',
  'Solomon',
  'Elijah',
  'Elisha',
  'Isaiah',
  'Jeremiah',
  'Ezekiel',
  'Daniel',
  'Jonah',
  'Ruth',
  'Esther',
  'Nehemiah',
  'Ezra',
  'Job',
  'Noah',
  'Adam',
  'Eve',
  'Cain',
  'Abel',
  'Enoch',
  'Sarah',
  'Rebekah',
  'Rachel',
  'Leah',
  'Miriam',
  'Deborah',
  'Gideon',
  'Samson',
  'Hannah',
  'Naomi',
  'Boaz',
  'Absalom',
  'Hezekiah',
  'Josiah',
  'Nebuchadnezzar',
  'Peter',
  'Paul',
  'John',
  'James',
  'Matthew',
  'Mark',
  'Luke',
  'Timothy',
  'Titus',
  'Stephen',
  'Barnabas',
  'Silas',
  'Philip',
  'Thomas',
  'Andrew',
  'Martha',
  'Lazarus',
  'Pilate',
  'Herod',
  'Caiaphas',
  'Nicodemus',
  'Zacchaeus',
  'Cornelius',
  'Jerusalem',
  'Bethlehem',
  'Nazareth',
  'Egypt',
  'Babylon',
  'Damascus',
  'Jericho',
  'Galilee',
  'Samaria',
  'Jordan',
  'Sinai',
  'Canaan',
  'Nineveh',
  'Antioch',
  'Corinth',
  'Ephesus',
  'Athens',
  'Rome',
  'Gaza',
  'Hebron',
  'Bethany',
  'Capernaum',
  'Patmos',
];

/**
 * A name really in the book, against three that are not.
 *
 * The names come from the build's own record of who is named where, which was checked
 * against this translation's text, so the right answer is never a name the book does
 * not contain.
 */
function whoAndWhere(
  book: Book,
  verses: Verse[],
  present: Map<string, { chapter: number; verse: number }>,
  next: () => number,
): Question | null {
  const text = verses.map((verse) => verse.text).join(' ');
  const named = [...present.keys()].filter((name) => name.length >= 4);
  if (named.length === 0) return null;

  const elsewhere = FAMILIAR.filter(
    (name) => !present.has(name) && !new RegExp(`\\b${name}`, 'i').test(text),
  );
  if (elsewhere.length < 3) return null;

  const answer = pick(named, next);
  const options = shuffle([answer, ...shuffle(elsewhere, next).slice(0, 3)], next);
  const at = present.get(answer)!;

  return {
    kind: 'who-and-where',
    prompt: `Which of these is named in ${book.name}?`,
    reference: { bookId: book.id, book: book.name, chapter: at.chapter, verse: at.verse },
    options,
    answer: options.indexOf(answer),
    note: `${answer} appears at ${book.name} ${at.chapter}:${at.verse}.`,
  };
}

export type Quiz = {
  book: Book;
  seed: number;
  questions: Question[];
};

/**
 * Builds a quiz over one book.
 *
 * Questions are drawn from across the whole book rather than clustered, and no verse is
 * asked about twice. If a book is too short to furnish a kind of question — Obadiah has
 * one chapter, so there is nowhere to place a verse within it — that kind is simply left
 * out rather than asked badly.
 */
export async function buildQuiz(book: Book, count = 10, seed = Date.now()): Promise<Quiz> {
  const all = await wholeBook(book);

  // Who and what is named in this book, and where each is first named, from the data
  // the build checked against the text.
  const present = new Map<string, { chapter: number; verse: number }>();
  for (const [key, list] of Object.entries(await marksFor(book.id))) {
    const [chapter, verse] = key.split(':').map(Number);
    for (const [form] of list) {
      const existing = present.get(form);
      if (!existing || chapter < existing.chapter) present.set(form, { chapter, verse });
    }
  }

  const verses = askable(all);
  const next = rng(seed);

  if (verses.length === 0) return { book, seed, questions: [] };

  const { counts, display } = vocabularyOf(all);
  const vocabulary = [...counts.entries()]
    .filter(([word, times]) => word.length >= 4 && !COMMON.has(word) && times >= 2)
    .map(([word]) => word);

  const questions: Question[] = [];
  const usedVerses = new Set<string>();
  const usedPrompts = new Set<string>();

  // Weighted towards the missing word, which is the kind that tests the text itself.
  const order: Question['kind'][] = [];
  for (let i = 0; i < count; i += 1) {
    order.push(i % 4 === 1 ? 'where-from' : i % 4 === 3 ? 'who-and-where' : 'missing-word');
  }

  for (const kind of order) {
    let question: Question | null = null;

    for (let attempt = 0; attempt < 12 && !question; attempt += 1) {
      const made =
        kind === 'missing-word'
          ? missingWord(book, verses, counts, display, vocabulary, next)
          : kind === 'where-from'
            ? whereFrom(book, verses, next)
            : whoAndWhere(book, verses, present, next);

      if (!made) break;
      const at = `${made.reference.chapter}:${made.reference.verse}`;
      if (kind !== 'who-and-where' && usedVerses.has(at)) continue;
      if (usedPrompts.has(made.prompt)) continue;
      question = made;
    }

    // Fall back to the kind that works for every book rather than a short quiz.
    if (!question && kind !== 'missing-word') {
      question = missingWord(book, verses, counts, display, vocabulary, next);
      if (question && usedVerses.has(`${question.reference.chapter}:${question.reference.verse}`)) {
        question = null;
      }
    }

    if (!question) continue;
    usedVerses.add(`${question.reference.chapter}:${question.reference.verse}`);
    usedPrompts.add(question.prompt);
    questions.push(question);
  }

  return { book, seed, questions };
}
