import { describe, expect, it } from 'vitest';
import { matchBook, parseReference, rank, score } from './commands';
import type { Command } from './commands';

const command = (title: string, extra: Partial<Command> = {}): Command => ({
  id: title,
  title,
  group: 'Go',
  run: () => {},
  ...extra,
});

describe('score', () => {
  it('prefers a title that starts with what was typed', () => {
    const starts = score(command('Reading plan'), 'read');
    const contains = score(command('Continue reading'), 'read');
    expect(starts).toBeGreaterThan(contains as number);
  });

  it('finds a word in the middle of a title', () => {
    expect(score(command('Switch to Hebrew'), 'hebrew')).toBeGreaterThan(0);
  });

  it('finds a command by its keywords', () => {
    expect(score(command('Listen', { keywords: 'speak audio voice' }), 'audio')).toBeGreaterThan(0);
  });

  it('matches letters in order', () => {
    expect(score(command('Reading plan'), 'rdpl')).toBeGreaterThan(0);
  });

  it('returns null when nothing matches', () => {
    expect(score(command('Reading plan'), 'zzz')).toBeNull();
  });

  it('matches everything on an empty query', () => {
    expect(score(command('Anything'), '')).toBe(0);
  });
});

describe('rank', () => {
  const commands = [
    command('Continue reading'),
    command('Reading plan'),
    command('Review'),
    command('Quiz', { available: false }),
  ];

  it('puts the best match first', () => {
    expect(rank(commands, 'read')[0].title).toBe('Reading plan');
  });

  it('leaves out what is not available', () => {
    expect(rank(commands, '').map((c) => c.title)).not.toContain('Quiz');
  });

  it('keeps the original order among equal matches', () => {
    expect(rank(commands, '').map((c) => c.title)).toEqual([
      'Continue reading',
      'Reading plan',
      'Review',
    ]);
  });
});

describe('parseReference', () => {
  it('reads a book and chapter', () => {
    expect(parseReference('john 3')).toEqual({ book: 'john', chapter: 3, verse: undefined });
  });

  it('reads a book, chapter and verse', () => {
    expect(parseReference('john 3:16')).toEqual({ book: 'john', chapter: 3, verse: 16 });
  });

  it('reads a numbered book', () => {
    expect(parseReference('1 cor 13:4')).toEqual({ book: '1 cor', chapter: 13, verse: 4 });
  });

  it('reads a book with no space before the number', () => {
    expect(parseReference('gen1')).toEqual({ book: 'gen', chapter: 1, verse: undefined });
  });

  it('reads a book on its own', () => {
    expect(parseReference('revelation')).toEqual({
      book: 'revelation',
      chapter: undefined,
      verse: undefined,
    });
  });

  it('refuses a single letter, which would match half the Bible', () => {
    expect(parseReference('j')).toBeNull();
  });

  it('refuses a sentence, so ordinary words fall through to searching', () => {
    expect(parseReference('in the beginning God created')).toEqual({
      book: 'in the beginning God created',
      chapter: undefined,
      verse: undefined,
    });
  });
});

describe('matchBook', () => {
  const books = [
    { name: 'Genesis', abbreviation: 'Gen' },
    { name: 'John', abbreviation: 'Joh' },
    { name: '1 John', abbreviation: '1Jo' },
    { name: '1 Corinthians', abbreviation: '1Co' },
    { name: 'Jonah', abbreviation: 'Jon' },
  ];

  it('matches a full name', () => {
    expect(matchBook(books, 'genesis')?.name).toBe('Genesis');
  });

  it('matches an abbreviation', () => {
    expect(matchBook(books, 'gen')?.name).toBe('Genesis');
  });

  it('prefers the exact name over a longer one that starts the same', () => {
    expect(matchBook(books, 'john')?.name).toBe('John');
  });

  it('matches a numbered book written without its space', () => {
    expect(matchBook(books, '1cor')?.name).toBe('1 Corinthians');
  });

  it('matches a prefix', () => {
    expect(matchBook(books, 'jona')?.name).toBe('Jonah');
  });

  it('returns nothing for a name no book has', () => {
    expect(matchBook(books, 'zzz')).toBeNull();
  });
});
