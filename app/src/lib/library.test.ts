import { describe, expect, it } from 'vitest';
import { byBook, countKinds, coloursUsed, filter, gather } from './library';
import type { Book } from './bible';

const books = [
  { id: 1, name: 'Genesis', abbreviation: 'Gen', testament: 'OT', chapters: 50, words: 100 },
  { id: 43, name: 'John', abbreviation: 'Joh', testament: 'NT', chapters: 21, words: 100 },
] as Book[];

const saved = [
  {
    bookId: 43,
    book: 'John',
    chapter: 3,
    verse: 16,
    text: 'For God so loved the world',
    edition: 'kjv',
    savedAt: '2026-10-01T00:00:00.000Z',
  },
];

describe('gather', () => {
  it('brings the three kinds together', () => {
    const entries = gather({
      books,
      notes: { '1:12': 'Abram leaves on a promise' },
      marks: { '1:1:3': 5 },
      saved,
    });
    expect(entries.map((entry) => entry.kind).sort()).toEqual(['highlight', 'note', 'saved']);
  });

  it('puts them in reading order', () => {
    const entries = gather({
      books,
      notes: { '43:1': 'The Word' },
      marks: { '1:1:1': 0 },
      saved,
    });
    expect(entries.map((entry) => `${entry.book} ${entry.chapter}`)).toEqual([
      'Genesis 1',
      'John 1',
      'John 3',
    ]);
  });

  it('leaves out an emptied note', () => {
    const entries = gather({ books, notes: { '1:1': '   ' }, marks: {}, saved: [] });
    expect(entries).toEqual([]);
  });

  it('drops an entry whose book is not in the text', () => {
    const entries = gather({ books, notes: { '999:1': 'orphan' }, marks: {}, saved: [] });
    expect(entries).toEqual([]);
  });

  it('keeps the colour on a highlight', () => {
    const entries = gather({ books, notes: {}, marks: { '1:1:3': 7 }, saved: [] });
    expect(entries[0]).toMatchObject({ kind: 'highlight', colour: 7, verse: 3 });
  });

  it('ignores a malformed highlight key', () => {
    const entries = gather({ books, notes: {}, marks: { bad: 1, '1:2': 2 }, saved: [] });
    expect(entries).toEqual([]);
  });
});

describe('filter', () => {
  const entries = gather({
    books,
    notes: { '1:12': 'Abram leaves on a promise' },
    marks: { '1:1:3': 5, '43:1:1': 9 },
    saved,
  });

  it('shows everything when no kind is chosen', () => {
    expect(filter(entries, { kinds: [], query: '' })).toHaveLength(4);
  });

  it('narrows to one kind', () => {
    expect(filter(entries, { kinds: ['note'], query: '' })).toHaveLength(1);
  });

  it('narrows to several kinds', () => {
    expect(filter(entries, { kinds: ['note', 'saved'], query: '' })).toHaveLength(2);
  });

  it('narrows to one colour', () => {
    expect(filter(entries, { kinds: [], colour: 9, query: '' })).toHaveLength(1);
  });

  it('searches the words', () => {
    expect(filter(entries, { kinds: [], query: 'loved the world' })).toHaveLength(1);
  });

  it('searches the reference', () => {
    expect(filter(entries, { kinds: [], query: 'john 3:16' })).toHaveLength(1);
  });

  it('ignores case', () => {
    expect(filter(entries, { kinds: [], query: 'ABRAM' })).toHaveLength(1);
  });
});

describe('countKinds', () => {
  it('counts each kind', () => {
    const entries = gather({
      books,
      notes: { '1:1': 'a', '1:2': 'b' },
      marks: { '1:1:1': 0 },
      saved,
    });
    expect(countKinds(entries)).toEqual({ note: 2, highlight: 1, saved: 1 });
  });
});

describe('coloursUsed', () => {
  it('lists only the colours in use, with counts', () => {
    const entries = gather({
      books,
      notes: {},
      marks: { '1:1:1': 3, '1:1:2': 3, '1:2:1': 8 },
      saved: [],
    });
    expect(coloursUsed(entries)).toEqual([
      { index: 3, count: 2 },
      { index: 8, count: 1 },
    ]);
  });
});

describe('byBook', () => {
  it('groups while keeping reading order', () => {
    const entries = gather({
      books,
      notes: { '1:1': 'a', '43:1': 'b' },
      marks: { '1:5:1': 0 },
      saved: [],
    });
    const groups = byBook(entries);
    expect(groups.map((group) => group.book)).toEqual(['Genesis', 'John']);
    expect(groups[0].entries).toHaveLength(2);
  });
});
