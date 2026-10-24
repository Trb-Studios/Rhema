/**
 * The quiz: a bank of questions for every book, and the rules of the game.
 *
 * Each book has a fixed bank — ten questions for a book under ten chapters, twenty under
 * thirty, fifty for the long books — chosen for what a reader would want to carry away:
 * the story the book tells, what it shows of God, and the facts worth having to hand
 * later. Every question cites the verse its answer rests on, and the app shows that
 * verse after each answer, so nothing has to be taken on trust.
 *
 * The questions were written with AI help and checked against the King James text; the
 * quiz carries the AI sparkle accordingly. A script (data/scripts/check-quiz.mjs) checks
 * every reference exists and every fill-in-the-verse is the verse word for word.
 *
 * The same bank is played three ways. Easy is all multiple choice with no clock. Medium
 * gives a minute per question and asks some answers to be typed. Hard is mostly typed,
 * with questions to put in order, pair up and complete — the interactive kinds.
 */

export type Focus = 'story' | 'god' | 'remember';
export type Kind = 'choice' | 'tf' | 'typed' | 'order' | 'match' | 'fill';
export type Level = 'easy' | 'medium' | 'hard';

/** A question as written in the bank files: short keys, because there are 1,370 of them. */
export type RawQuestion = {
  /** Kind; "choice" when absent. */
  t?: Kind;
  /** 1 easy, 2 middling, 3 hard. */
  l: 1 | 2 | 3;
  f: Focus;
  q: string;
  /** The answer: text, true or false for tf. */
  a?: string | boolean;
  /** Wrong answers, for multiple choice. */
  w?: string[];
  /** Other ways of writing the answer that count as right when typed. */
  acc?: string[];
  /** 0 where the answer is too long to type sensibly; it is then only ever multiple choice. */
  ty?: 0;
  /** For order: the right order. */
  items?: string[];
  /** For match: the right pairs. */
  pairs?: Array<[string, string]>;
  /** For fill: the verse, with the words to supply in [brackets]. */
  text?: string;
  /** Verse reference, "Gen.1.3". */
  r: string;
  /** A sentence of explanation shown after the answer. */
  x?: string;
};

export type BankFile = { book: number; questions: RawQuestion[] };

export type Question = RawQuestion & { id: string; bookId: number };

/** How a question is put on this occasion. One bank question can be asked several ways. */
export type Asked =
  | { as: 'choice'; question: Question; options: string[]; answer: string }
  | { as: 'tf'; question: Question; answer: boolean }
  | { as: 'typed'; question: Question; answer: string; accept: string[]; wrong: string[] }
  | { as: 'order'; question: Question; items: string[]; shuffled: string[] }
  | { as: 'match'; question: Question; pairs: Array<[string, string]>; right: string[] }
  | { as: 'fill'; question: Question; parts: Array<string | { blank: string }>; tiles: string[] };

/** The bank size a book should have, by its length. */
export function expectedCount(chapters: number): number {
  if (chapters < 10) return 10;
  if (chapters < 30) return 20;
  return 50;
}

const files = import.meta.glob<BankFile>('../data/quiz/*.json', { import: 'default' });

/** The book's questions, or an empty list if its bank has not been written. */
export async function bankFor(bookId: number): Promise<Question[]> {
  const key = Object.keys(files).find((path) => {
    const match = /\/(\d+)-[^/]+\.json$/.exec(path);
    return match !== null && Number(match[1]) === bookId;
  });
  if (!key) return [];
  const file = await files[key]();
  return file.questions.map((question, index) => ({
    ...question,
    id: `${bookId}-${index + 1}`,
    bookId,
  }));
}

/** Which books have a bank, without loading any. */
export function booksWithBanks(): Set<number> {
  const out = new Set<number>();
  for (const path of Object.keys(files)) {
    const match = /\/(\d+)-[^/]+\.json$/.exec(path);
    if (match) out.add(Number(match[1]));
  }
  return out;
}

/** A small seeded generator, so a round can be replayed exactly in tests. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}

export function shuffle<T>(list: T[], random: () => number): T[] {
  const out = [...list];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [out[index], out[swap]] = [out[swap], out[index]];
  }
  return out;
}

/** Whether a question's answer is short enough to be typed rather than picked. */
function typeable(question: Question): boolean {
  if (question.ty === 0 || typeof question.a !== 'string') return false;
  return question.a.length <= 32 && question.a.split(/\s+/).length <= 4;
}

const INTERACTIVE: Kind[] = ['order', 'match', 'fill'];

function askAs(question: Question, as: Asked['as'], random: () => number): Asked | null {
  if (as === 'tf' && typeof question.a === 'boolean') return { as, question, answer: question.a };
  if (as === 'choice' && typeof question.a === 'string' && question.w?.length) {
    const options = shuffle([question.a, ...question.w.slice(0, 3)], random);
    return { as, question, options, answer: question.a };
  }
  if (as === 'typed' && typeof question.a === 'string') {
    return { as, question, answer: question.a, accept: question.acc ?? [], wrong: question.w ?? [] };
  }
  if (as === 'order' && question.items?.length) {
    let shuffled = shuffle(question.items, random);
    // Never hand over the answer already in order.
    for (let tries = 0; tries < 5 && shuffled.every((item, index) => item === question.items![index]); tries += 1) {
      shuffled = shuffle(question.items, random);
    }
    return { as, question, items: question.items, shuffled };
  }
  if (as === 'match' && question.pairs?.length) {
    return {
      as,
      question,
      pairs: question.pairs,
      right: shuffle(
        question.pairs.map(([, right]) => right),
        random,
      ),
    };
  }
  if (as === 'fill' && question.text) {
    const parts: Array<string | { blank: string }> = [];
    const blanks: string[] = [];
    for (const piece of question.text.split(/(\[[^\]]+\])/)) {
      if (!piece) continue;
      const match = /^\[([^\]]+)\]$/.exec(piece);
      if (match) {
        parts.push({ blank: match[1] });
        blanks.push(match[1]);
      } else {
        parts.push(piece);
      }
    }
    return { as, question, parts, tiles: shuffle([...blanks, ...(question.w ?? []).slice(0, 3)], random) };
  }
  return null;
}

/**
 * Builds a round: which questions, in what order, asked which way.
 *
 * Easy draws first on the easier questions and asks everything as multiple choice or
 * true-or-false. Medium uses the whole bank, types about one answer in three, and leaves
 * out the interactive kinds. Hard types every answer it can, puts every interactive
 * question in, and offers choices only where an answer cannot fairly be typed.
 */
export function buildRound(bank: Question[], level: Level, length: number, seed: number): Asked[] {
  const random = seeded(seed);
  const order = shuffle(bank, random);

  let pool: Question[];
  if (level === 'easy') {
    const easier = order.filter((question) => question.l <= 2 && !INTERACTIVE.includes(question.t ?? 'choice'));
    const rest = order.filter((question) => question.l === 3 && !INTERACTIVE.includes(question.t ?? 'choice'));
    pool = [...easier, ...rest];
  } else if (level === 'medium') {
    pool = order.filter((question) => question.t !== 'order' && question.t !== 'match');
  } else {
    // Hard leads with the harder questions but keeps the bank's full range.
    pool = [...order].sort((a, b) => b.l - a.l + (random() - 0.5) * 1.5);
  }

  const out: Asked[] = [];
  let typedSoFar = 0;
  for (const question of pool) {
    if (out.length >= length) break;
    const kind = question.t ?? 'choice';
    let asked: Asked | null = null;

    if (kind === 'tf') asked = askAs(question, 'tf', random);
    else if (INTERACTIVE.includes(kind)) {
      if (level === 'hard' || (level === 'medium' && kind === 'fill')) asked = askAs(question, kind, random);
    } else if (level === 'easy') {
      asked = askAs(question, 'choice', random);
    } else if (level === 'medium') {
      // About one in three typed, starting from the third: Medium opens with a choice.
      const wantTyped = typeable(question) && (kind === 'typed' || typedSoFar < Math.floor((out.length + 1) / 3));
      asked = askAs(question, wantTyped ? 'typed' : 'choice', random) ?? askAs(question, 'typed', random);
    } else {
      asked = typeable(question) ? askAs(question, 'typed', random) : askAs(question, 'choice', random);
    }

    if (!asked) asked = askAs(question, 'choice', random);
    if (!asked) continue;
    if (asked.as === 'typed') typedSoFar += 1;
    out.push(asked);
  }
  return out;
}

/** Seconds allowed per question; Easy has no clock. */
export function timeFor(level: Level, asked: Asked): number | null {
  if (level === 'easy') return null;
  if (asked.as === 'order' || asked.as === 'match' || asked.as === 'fill') return 90;
  return 60;
}

const NUMBERS: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8',
  nine: '9', ten: '10', eleven: '11', twelve: '12', thirteen: '13', fourteen: '14',
  fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20',
  thirty: '30', forty: '40', fifty: '50', sixty: '60', seventy: '70', hundred: '100',
  thousand: '1000', first: '1', second: '2', third: '3', fourth: '4', fifth: '5', sixth: '6',
  seventh: '7',
};

/**
 * Reduces an answer to what matters: lowercase letters and numbers, no punctuation, no
 * "the" or "a", numbers as digits, and the King James' -eth and -est endings matched to
 * modern ones.
 */
export function normalise(text: string): string {
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !['the', 'a', 'an', 'of', 'to', 'mount', 'mt', 'king', 'saint', 'st'].includes(word))
    .map((word) => NUMBERS[word] ?? word);
  // "seventy five" and "seventy and five", as the King James writes it, are 75.
  const out: string[] = [];
  for (let index = 0; index < words.length; index += 1) {
    const tens = Number(words[index]);
    const skip = words[index + 1] === 'and' ? 2 : 1;
    const units = Number(words[index + skip]);
    if (tens >= 20 && tens <= 90 && tens % 10 === 0 && units >= 1 && units <= 9) {
      out.push(String(tens + units));
      index += skip;
    } else {
      out.push(words[index]);
    }
  }
  return out.join(' ').trim();
}

/** Edit distance with transpositions, so "Abarham" is one slip from "Abraham", not two. */
export function distance(a: string, b: string): number {
  const rows = a.length + 1;
  const columns = b.length + 1;
  const grid: number[][] = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => (row === 0 ? column : column === 0 ? row : 0)),
  );
  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      grid[row][column] = Math.min(
        grid[row - 1][column] + 1,
        grid[row][column - 1] + 1,
        grid[row - 1][column - 1] + cost,
      );
      if (row > 1 && column > 1 && a[row - 1] === b[column - 2] && a[row - 2] === b[column - 1]) {
        grid[row][column] = Math.min(grid[row][column], grid[row - 2][column - 2] + 1);
      }
    }
  }
  return grid[a.length][b.length];
}

/** How many slips a word of this length may carry and still count. */
function slipsFor(length: number): number {
  // Short names must be exact: one letter is all that separates Saul from Paul.
  if (length <= 4) return 0;
  if (length <= 6) return 1;
  if (length <= 10) return 2;
  return 3;
}

/**
 * Whether a typed answer should count. Deliberately generous: spelling slips scaled to
 * the length of the word, extra words around the right one, and any listed alternative.
 * But never an answer that is nearer one of the wrong options than the right one.
 */
export function isRight(
  typed: string,
  answer: string,
  accept: string[] = [],
  wrong: string[] = [],
): boolean {
  const given = normalise(typed);
  if (!given) return false;
  const nearestWrong = Math.min(
    Infinity,
    ...wrong.map((option) => distance(given, normalise(option))),
  );
  const nearestRight = Math.min(
    ...[answer, ...accept].map((option) => distance(given, normalise(option))),
  );
  if (nearestWrong < nearestRight) return false;

  for (const option of [answer, ...accept]) {
    const wanted = normalise(option);
    if (!wanted) continue;
    if (given === wanted) return true;
    const allowed = slipsFor(wanted.length);
    if (distance(given, wanted) <= allowed) return true;
    // "it was Moses" for "Moses"; "the Red Sea" for "Red Sea".
    const words = given.split(' ');
    const target = wanted.split(' ');
    if (
      target.length <= words.length &&
      words.some((_, start) => {
        const slice = words.slice(start, start + target.length).join(' ');
        return slice.length > 0 && distance(slice, wanted) <= allowed;
      })
    ) {
      return true;
    }
    // A one-word answer given as its most distinctive word: "Goliath" for "Goliath of Gath".
    const longest = [...target].sort((x, y) => y.length - x.length)[0];
    if (
      target.length > 1 &&
      longest.length >= 5 &&
      words.some((word) => distance(word, longest) <= slipsFor(longest.length))
    ) {
      return true;
    }
  }
  return false;
}

/** Points for a right answer: by level, a bonus for time left, and the run multiplier. */
export function pointsFor(level: Level, secondsLeft: number | null, streak: number): number {
  const base = level === 'easy' ? 100 : level === 'medium' ? 150 : 200;
  const speed = secondsLeft === null ? 0 : Math.round(secondsLeft * 2);
  const multiplier = 1 + Math.min(streak, 4) * 0.25;
  return Math.round((base + speed) * multiplier);
}

export const LIVES: Record<Level, number> = { easy: 5, medium: 3, hard: 3 };
