#!/usr/bin/env node
/**
 * Checks the quiz banks against the text.
 *
 *   npm run quiz:check
 *
 * Every question cites a verse; this confirms the verse exists. Every fill-in-the-verse
 * must be the King James word for word once its brackets are removed, so a misquotation
 * cannot reach the app. Each book must have exactly the number of questions its length
 * calls for — ten under ten chapters, twenty under thirty, fifty beyond — and every
 * question must have what its kind needs. Exits non-zero on any failure, so CI can
 * refuse a bad bank.
 */

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOKS } from './names.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const QUIZ = join(ROOT, 'app', 'src', 'data', 'quiz');
const BIBLE = join(ROOT, 'app', 'public', 'bible');

const expected = (chapters) => (chapters < 10 ? 10 : chapters < 30 ? 20 : 50);
// Straight and curly quotes are the same words; the source text uses curly ones.
const squash = (text) =>
  text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const index = JSON.parse(await readFile(join(BIBLE, 'index.json'), 'utf8'));
const texts = new Map();
async function textOf(bookId) {
  if (!texts.has(bookId)) texts.set(bookId, JSON.parse(await readFile(join(BIBLE, `${bookId}.json`), 'utf8')));
  return texts.get(bookId);
}

function parseRef(ref) {
  const match = /^([1-3]?[A-Za-z]{2,3})\.(\d+)\.(\d+)(?:-(\d+))?$/.exec(ref ?? '');
  if (!match) return null;
  const bookId = BOOKS.indexOf(match[1]) + 1;
  if (!bookId) return null;
  return { bookId, chapter: Number(match[2]), verse: Number(match[3]), last: match[4] ? Number(match[4]) : null };
}

const problems = [];
let total = 0;
const files = (await readdir(QUIZ)).filter((name) => name.endsWith('.json')).sort();
const seen = new Set();

for (const name of files) {
  const file = JSON.parse(await readFile(join(QUIZ, name), 'utf8'));
  const bookId = Number(/^(\d+)-/.exec(name)?.[1]);
  const book = index.find((entry) => entry.id === bookId);
  const say = (message) => problems.push(`${name}: ${message}`);
  if (!book || file.book !== bookId) {
    say(`file number and "book" (${file.book}) disagree`);
    continue;
  }
  seen.add(bookId);
  const want = expected(book.chapters);
  if (file.questions.length !== want) say(`has ${file.questions.length} questions; ${book.name} (${book.chapters} chapters) needs ${want}`);

  const prompts = new Set();
  for (const [at, question] of file.questions.entries()) {
    total += 1;
    const label = `#${at + 1}`;
    const kind = question.t ?? 'choice';
    if (!question.q) say(`${label} has no question`);
    if (prompts.has(question.q)) say(`${label} repeats an earlier question`);
    prompts.add(question.q);
    if (![1, 2, 3].includes(question.l)) say(`${label} level should be 1, 2 or 3`);
    if (!['story', 'god', 'remember'].includes(question.f)) say(`${label} focus should be story, god or remember`);

    const ref = parseRef(question.r);
    if (!ref) say(`${label} reference "${question.r}" is not in Book.chapter.verse form`);
    else {
      const text = await textOf(ref.bookId);
      const verse = text.chapters[ref.chapter - 1]?.[ref.verse - 1];
      if (!verse) say(`${label} reference ${question.r} is not a verse in the KJV`);
      if (ref.last && !text.chapters[ref.chapter - 1]?.[ref.last - 1]) say(`${label} range end ${question.r} is not a verse`);
      if (kind === 'fill' && verse) {
        const plain = squash(question.text.replace(/\[([^\]]+)\]/g, '$1'));
        const wanted = squash(
          (ref.last ? text.chapters[ref.chapter - 1].slice(ref.verse - 1, ref.last) : [verse]).join(' '),
        );
        if (!wanted.includes(plain)) say(`${label} fill text does not match ${question.r} word for word:\n      got  "${plain}"\n      KJV  "${wanted}"`);
      }
    }

    if (kind === 'choice' || kind === 'typed') {
      if (typeof question.a !== 'string' || !question.a) say(`${label} needs a text answer`);
      if (kind === 'choice' && (!Array.isArray(question.w) || question.w.length < 3)) say(`${label} needs three wrong answers`);
      if (question.w?.some((wrong) => wrong.toLowerCase() === String(question.a).toLowerCase())) say(`${label} lists the answer among the wrong ones`);
      if (question.w && new Set(question.w).size !== question.w.length) say(`${label} repeats a wrong answer`);
    }
    if (kind === 'tf' && typeof question.a !== 'boolean') say(`${label} true-or-false needs a true or false answer`);
    if (kind === 'order' && (!Array.isArray(question.items) || question.items.length < 3)) say(`${label} order needs at least three items`);
    if (kind === 'match' && (!Array.isArray(question.pairs) || question.pairs.length < 3)) say(`${label} match needs at least three pairs`);
    if (kind === 'fill' && !/\[[^\]]+\]/.test(question.text ?? '')) say(`${label} fill needs at least one [blank]`);
  }
}

const missing = index.filter((book) => !seen.has(book.id)).map((book) => book.name);
process.stdout.write(`Checked ${total} questions in ${files.length} books.\n`);
if (missing.length) process.stdout.write(`No bank yet: ${missing.join(', ')}\n`);
if (problems.length) {
  process.stdout.write(`\n${problems.length} problems:\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
process.stdout.write('All good.\n');
