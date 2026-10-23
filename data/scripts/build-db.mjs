#!/usr/bin/env node
/**
 * Builds the Bible database.
 *
 *   npm run data:build            reuses anything already downloaded
 *   npm run data:build -- --force re-downloads and rebuilds from scratch
 *
 * Downloads what it needs into data/raw, loads it into data/bible.db, and copies that
 * where the installer expects it.
 *
 * Uses Node's own SQLite, so there is nothing extra to install on a dev machine or on
 * the release runner. The app itself reads the database through Rust, not through this.
 *
 * Only the KJV loads today. Strong's, people, places, and cross-references each get a
 * loader of their own as they are added. See data/sources.json for the list and the
 * licence on each one.
 */

import { DatabaseSync } from 'node:sqlite';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile, copyFile, stat, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..');
const RAW = join(DATA, 'raw');
const DB = join(DATA, 'bible.db');
const BUNDLE = join(DATA, '..', 'app', 'src-tauri', 'resources', 'bible.db');
const WEB = join(DATA, '..', 'app', 'public', 'bible');

// This edition keeps the small-capital LORD that marks the divine name, and spells
// place names without the dashes an older edition used. Both matter for study: LORD
// renders YHWH and is a different word from "Lord", and the dashes stopped place names
// matching. See data/sources.json.
const KJV_BASE = 'https://raw.githubusercontent.com/aruljohn/Bible-kjv/master/';

/** The 39th book ends the Old Testament. */
const OT_BOOK_COUNT = 39;

const force = process.argv.includes('--force');

function say(message) {
  process.stdout.write(`${message}\n`);
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Downloads a file once. Anything already in raw/ is reused unless --force is passed. */
async function fetchOnce(url, destination) {
  if (!force && (await exists(destination))) return destination;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status} ${response.statusText}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
  return destination;
}

/**
 * Psalm 119 is an acrostic: each of its 22 sections opens with a Hebrew letter. The
 * source carries that letter inside the first verse of each section, which would read
 * as "\u05d0 ALEPH. Blessed are the undefiled...". It is a heading, so it is kept as one.
 */
const ACROSTIC = /^([\u0590-\u05FF]+)\s+([A-Z]+)\.\s+/;

function splitHeading(text) {
  const match = ACROSTIC.exec(text);
  if (!match) return { heading: null, text };
  return { heading: `${match[1]} ${match[2]}`, text: text.slice(match[0].length) };
}

/** A short, unique abbreviation for each book: Gen, Exo, 1Sa, 1Ki. */
function abbreviate(name, taken) {
  const digit = name.match(/^(\d)\s*/)?.[1] ?? '';
  const letters = name.replace(/^\d\s*/, '').replace(/[^A-Za-z]/g, '');
  let candidate = (digit + letters.slice(0, digit ? 2 : 3)).padEnd(3, 'x');

  let suffix = 1;
  while (taken.has(candidate)) {
    candidate = (digit + letters.slice(0, 2) + suffix).slice(0, 4);
    suffix += 1;
  }
  taken.add(candidate);
  return candidate;
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function main() {
  say('Building the Bible database');

  await mkdir(RAW, { recursive: true });
  await mkdir(dirname(BUNDLE), { recursive: true });

  // A build always starts from a clean database, so a reload never doubles up rows.
  for (const leftover of [DB, `${DB}-wal`, `${DB}-shm`]) {
    await rm(leftover, { force: true });
  }

  // 1. Schema
  say('\nSchema');
  const db = new DatabaseSync(DB);
  db.exec(await readFile(join(DATA, 'schema.sql'), 'utf8'));
  say('  tables ready');

  // 2. The KJV
  say('\nKing James Version');
  const bookNames = JSON.parse(
    await readFile(await fetchOnce(`${KJV_BASE}Books.json`, join(RAW, 'books.json')), 'utf8'),
  );
  if (bookNames.length !== 66) {
    throw new Error(`Expected 66 book names, got ${bookNames.length}.`);
  }

  const insertBook = db.prepare(
    `INSERT INTO books (id, name, abbreviation, testament, chapter_count, position)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const insertVerse = db.prepare(
    `INSERT INTO verses (id, book_id, chapter, verse, text, heading, word_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  const taken = new Set();
  let bookId = 0;
  let verseId = 0;
  let wordTotal = 0;

  db.exec('BEGIN');
  for (const name of bookNames) {
    bookId += 1;
    // The source names its files without spaces: "1 Samuel" is 1Samuel.json.
    const file = await fetchOnce(
      `${KJV_BASE}${encodeURIComponent(name.replace(/\s/g, ''))}.json`,
      join(RAW, `${name.replace(/\s/g, '')}.json`),
    );
    const book = JSON.parse(await readFile(file, 'utf8'));
    const chapters = book.chapters ?? [];

    insertBook.run(
      bookId,
      name,
      abbreviate(name, taken),
      bookId <= OT_BOOK_COUNT ? 'OT' : 'NT',
      chapters.length,
      bookId,
    );

    for (const chapter of chapters) {
      const chapterNumber = Number(chapter.chapter);
      for (const verse of chapter.verses ?? []) {
        const { heading, text } = splitHeading(String(verse.text).trim());
        if (!text) continue;
        verseId += 1;
        const words = countWords(text);
        wordTotal += words;
        insertVerse.run(
          verseId,
          bookId,
          chapterNumber,
          Number(verse.verse),
          text,
          heading ?? null,
          words,
        );
      }
    }
  }

  const record = db.prepare('INSERT OR REPLACE INTO build_info (key, value) VALUES (?, ?)');
  record.run('built_at', new Date().toISOString());
  record.run('translation', 'KJV');
  record.run('books', String(bookId));
  record.run('verses', String(verseId));
  record.run('words', String(wordTotal));
  db.exec('COMMIT');

  say(
    `  loaded ${bookId} books, ${verseId.toLocaleString()} verses, ` +
      `${wordTotal.toLocaleString()} words`,
  );

  // The reading plan schedules by words, so a wrong total would skew every estimate.
  if (bookId !== 66) {
    throw new Error(`Expected 66 books, got ${bookId}. The source file looks wrong.`);
  }
  if (verseId < 30_000) {
    throw new Error(`Only ${verseId} verses loaded. The source file looks incomplete.`);
  }

  // Search has to work before the database is handed over.
  const hit = db
    .prepare(
      `SELECT b.name, v.chapter, v.verse FROM verses_fts f
         JOIN verses v ON v.id = f.rowid
         JOIN books b ON b.id = v.book_id
        WHERE verses_fts MATCH ? LIMIT 1`,
    )
    .get('beginning');
  if (!hit) throw new Error('Full-text search returned nothing. The index did not build.');
  say(`  search works (${hit.name} ${hit.chapter}:${hit.verse})`);

  db.exec('PRAGMA journal_mode = DELETE');
  db.exec('VACUUM');
  db.close();

  // 3. Still to come. Each gets a loader here as its dataset is added.
  say('\nNot loaded yet (see data/sources.json)');
  for (const pending of [
    "Strong's numbers and lexicons",
    'Hebrew and Greek word tagging',
    'People, families, and places',
    'Cross-references and topics',
  ]) {
    say(`  · ${pending}`);
  }

  // 4. Hand it to the app
  await copyFile(DB, BUNDLE);
  const size = (await stat(DB)).size / 1024 / 1024;
  say(`\nDone. ${size.toFixed(1)} MB at data/bible.db, copied into the app.`);

  await exportForWeb();
}

/**
 * Writes the same text out as JSON for `npm run dev:web`, where the interface runs in a
 * plain browser with no Rust build. It means the reader can be designed and reviewed
 * against the real text rather than a sample. These files are build output, not source.
 */
async function exportForWeb() {
  say('\nWeb preview');

  const db = new DatabaseSync(DB, { readOnly: true });
  const books = db.prepare('SELECT * FROM books ORDER BY position').all();
  const verses = db
    .prepare(
      'SELECT book_id, chapter, verse, text, heading FROM verses ORDER BY book_id, chapter, verse',
    )
    .all();
  const wordsByBook = new Map(
    db
      .prepare('SELECT book_id, SUM(word_count) AS words FROM verses GROUP BY book_id')
      .all()
      .map((row) => [row.book_id, row.words]),
  );
  db.close();

  await mkdir(WEB, { recursive: true });

  const byBook = new Map();
  const headings = new Map();
  for (const row of verses) {
    if (!byBook.has(row.book_id)) byBook.set(row.book_id, new Map());
    const chapters = byBook.get(row.book_id);
    if (!chapters.has(row.chapter)) chapters.set(row.chapter, []);
    chapters.get(row.chapter).push(row.text);

    if (row.heading) {
      if (!headings.has(row.book_id)) headings.set(row.book_id, {});
      headings.get(row.book_id)[`${row.chapter}:${row.verse}`] = row.heading;
    }
  }

  for (const book of books) {
    const chapters = byBook.get(book.id) ?? new Map();
    const ordered = [...chapters.keys()].sort((a, b) => a - b).map((n) => chapters.get(n));
    await writeFile(
      join(WEB, `${book.id}.json`),
      JSON.stringify({
        name: book.name,
        chapters: ordered,
        headings: headings.get(book.id) ?? {},
      }),
    );
  }

  await writeFile(
    join(WEB, 'index.json'),
    JSON.stringify(
      books.map((book) => ({
        id: book.id,
        name: book.name,
        abbreviation: book.abbreviation,
        testament: book.testament,
        chapters: book.chapter_count,
        words: wordsByBook.get(book.id) ?? 0,
      })),
    ),
  );

  say(`  wrote ${books.length} books to app/public/bible`);
}

main().catch((error) => {
  process.stderr.write(`\nBuild failed: ${error.message}\n`);
  process.exit(1);
});
