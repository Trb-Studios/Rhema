import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Book } from './bible';
import { buildQuiz, rng } from './quiz';
import type { Question } from './quiz';

const books = JSON.parse(
  readFileSync(new URL('../../public/bible/index.json', import.meta.url), 'utf8'),
) as Book[];

/** Serves the generated book files the way the browser would. */
beforeAll(() => {
  // The reader resolves data relative to the page, so the stand-in page lives where
  // the built site would: one level above the bible folder.
  (globalThis as { document?: unknown }).document = {
    baseURI: new URL('../../public/', import.meta.url).href,
  };
  (globalThis as { fetch?: unknown }).fetch = async (url: URL | string) => {
    const path = new URL(String(url));
    const text = readFileSync(path, 'utf8');
    return { ok: true, json: async () => JSON.parse(text) };
  };
});

const find = (name: string) => books.find((book) => book.name === name)!;

/** The verse a question came from, as it really stands in the text. */
function sourceVerse(question: Question): Promise<string> {
  const file = new URL(`../../public/bible/${question.reference.bookId}.json`, import.meta.url);
  const data = JSON.parse(readFileSync(file, 'utf8')) as { chapters: string[][] };
  return Promise.resolve(
    data.chapters[question.reference.chapter - 1][question.reference.verse - 1],
  );
}

describe('the random source', () => {
  it('repeats exactly for the same seed', () => {
    const a = Array.from({ length: 20 }, rng(42));
    const b = Array.from({ length: 20 }, rng(42));
    expect(a).toEqual(b);
    expect(a).not.toEqual(Array.from({ length: 20 }, rng(43)));
  });

  it('stays inside 0 and 1', () => {
    const next = rng(7);
    for (let i = 0; i < 5000; i += 1) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('a quiz on Genesis', () => {
  let questions: Question[];

  beforeAll(async () => {
    questions = (await buildQuiz(find('Genesis'), 10, 2026)).questions;
  });

  it('asks the number of questions asked for', () => {
    expect(questions).toHaveLength(10);
  });

  it('prints names as names rather than lower case', () => {
    // "jesus" and "pilate" both gave the proper nouns away and read as though the app
    // did not know them.
    const named = questions
      .flatMap((q) => q.options)
      .filter((option) => ['jesus', 'pilate', 'jordan', 'moses', 'abraham'].includes(option));
    expect(named).toEqual([]);
  });

  it('gives every question four options and exactly one answer', () => {
    for (const question of questions) {
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(4);
    }
  });

  it('never asks about the same verse twice', () => {
    const seen = questions.map((q) => `${q.reference.chapter}:${q.reference.verse}`);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('cites a verse that exists', async () => {
    for (const question of questions) {
      const text = await sourceVerse(question);
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it('blanks a word that really is in the verse', async () => {
    for (const question of questions.filter((q) => q.kind === 'missing-word')) {
      const text = await sourceVerse(question);
      const answer = question.options[question.answer];
      expect(text.toLowerCase()).toContain(answer.toLowerCase());
      expect(question.prompt).toContain('————');
    }
  });

  it('does not leave the answer visible elsewhere in the prompt', () => {
    for (const question of questions.filter((q) => q.kind === 'missing-word')) {
      const answer = question.options[question.answer].toLowerCase();
      const words = question.prompt
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.replace(/[^a-z']/g, ''));
      expect(words).not.toContain(answer);
    }
  });

  it('offers distractors that are not in the verse either', () => {
    for (const question of questions.filter((q) => q.kind === 'missing-word')) {
      const words = question.prompt
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.replace(/[^a-z']/g, ''));
      question.options.forEach((option, index) => {
        if (index !== question.answer) expect(words).not.toContain(option.toLowerCase());
      });
    }
  });

  it('puts the verse in the band of chapters it is really in', () => {
    for (const question of questions.filter((q) => q.kind === 'where-from')) {
      const label = question.options[question.answer];
      const numbers = label.match(/\d+/g)!.map(Number);
      const from = numbers[0];
      const to = numbers[numbers.length - 1];
      expect(question.reference.chapter).toBeGreaterThanOrEqual(from);
      expect(question.reference.chapter).toBeLessThanOrEqual(to);
    }
  });

  it('names someone who is really in the book, and nobody who is not', async () => {
    const whole = JSON.parse(
      readFileSync(new URL('../../public/bible/1.json', import.meta.url), 'utf8'),
    ) as { chapters: string[][] };
    const text = whole.chapters.flat().join(' ');

    for (const question of questions.filter((q) => q.kind === 'who-and-where')) {
      question.options.forEach((option, index) => {
        const present = new RegExp(`\\b${option}\\b`).test(text);
        expect(present).toBe(index === question.answer);
      });
    }
  });

  it('repeats exactly for the same seed, and differs for another', async () => {
    const again = (await buildQuiz(find('Genesis'), 10, 2026)).questions;
    expect(again.map((q) => q.prompt)).toEqual(questions.map((q) => q.prompt));

    const other = (await buildQuiz(find('Genesis'), 10, 99)).questions;
    expect(other.map((q) => q.prompt)).not.toEqual(questions.map((q) => q.prompt));
  });
});

describe('books that are hard to quiz', () => {
  it('still manages a one-chapter book', async () => {
    // Obadiah has no chapters to place a verse among, so that kind must be left out
    // rather than asked badly.
    const quiz = await buildQuiz(find('Obadiah'), 6, 5);
    expect(quiz.questions.length).toBeGreaterThan(0);
    expect(quiz.questions.every((q) => q.kind !== 'where-from')).toBe(true);
    for (const question of quiz.questions) expect(question.options).toHaveLength(4);
  });

  it('manages a very short book', async () => {
    for (const name of ['Jude', '2 John', '3 John', 'Philemon', 'Haggai']) {
      const quiz = await buildQuiz(find(name), 6, 11);
      expect(quiz.questions.length).toBeGreaterThan(0);
      for (const question of quiz.questions) {
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options).size).toBe(4);
      }
    }
  });

  it('manages the longest book', async () => {
    const quiz = await buildQuiz(find('Psalms'), 10, 3);
    expect(quiz.questions).toHaveLength(10);
  });
});

describe('every book in the Bible', () => {
  it('produces a usable quiz, with a real answer, for all 66', async () => {
    const thin: string[] = [];

    for (const book of books) {
      const quiz = await buildQuiz(book, 8, 1234);
      if (quiz.questions.length < 4) thin.push(`${book.name} (${quiz.questions.length})`);

      for (const question of quiz.questions) {
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options).size).toBe(4);
        expect(question.options[question.answer]).toBeTruthy();
        expect(question.reference.chapter).toBeGreaterThanOrEqual(1);
        expect(question.reference.chapter).toBeLessThanOrEqual(book.chapters);
      }
    }

    expect(thin).toEqual([]);
  }, 60_000);
});
