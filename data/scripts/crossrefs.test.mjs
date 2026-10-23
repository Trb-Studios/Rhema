import { describe, expect, it } from 'vitest';
import { parseCrossRefs, parseTarget, parseVerse } from './crossrefs.mjs';

describe('reading a reference', () => {
  it('finds the book, chapter and verse', () => {
    expect(parseVerse('Gen.1.1')).toEqual({ bookId: 1, chapter: 1, verse: 1 });
    expect(parseVerse('Rev.22.21')).toEqual({ bookId: 66, chapter: 22, verse: 21 });
  });

  it('handles the numbered books and the ones easily confused', () => {
    expect(parseVerse('1Chr.2.1')?.bookId).toBe(13);
    expect(parseVerse('3John.1.1')?.bookId).toBe(64);
    expect(parseVerse('Judg.1.1')?.bookId).toBe(7);
    expect(parseVerse('Jude.1.1')?.bookId).toBe(65);
    expect(parseVerse('Job.1.1')?.bookId).toBe(18);
    expect(parseVerse('John.1.1')?.bookId).toBe(43);
  });

  it('refuses what is not a reference', () => {
    expect(parseVerse('nonsense')).toBe(null);
    expect(parseVerse('')).toBe(null);
    expect(parseVerse('Nope.1.1')).toBe(null);
  });
});

describe('reading a target', () => {
  it('reads a single verse', () => {
    expect(parseTarget('Zech.12.1')).toEqual({ bookId: 38, chapter: 12, verse: 1, last: 1 });
  });

  it('reads a passage as one link, not nine', () => {
    expect(parseTarget('Prov.8.22-Prov.8.30')).toEqual({
      bookId: 20,
      chapter: 8,
      verse: 22,
      last: 30,
    });
  });

  it('sends the reader to the opening verse when a passage crosses a chapter', () => {
    const target = parseTarget('Gen.1.31-Gen.2.3');
    expect(target).toEqual({ bookId: 1, chapter: 1, verse: 31, last: 31 });
  });
});

describe('choosing which references to keep', () => {
  const file = [
    'From Verse\tTo Verse\tVotes',
    'Gen.1.1\tJohn.1.1-John.1.3\t304',
    'Gen.1.1\tHeb.11.3\t238',
    'Gen.1.1\tIsa.45.18\t200',
    'Gen.1.2\tJob.26.7\t-5',
    'Gen.1.2\tPs.104.30\t0',
    'Gen.1.3\tGen.1.3\t99',
    'Gen.1.4\tnonsense\t50',
  ].join('\n');

  const links = parseCrossRefs(file);

  it('keeps the links readers voted up', () => {
    expect(links.filter((link) => link.from.verse === 1)).toHaveLength(3);
  });

  it('drops the ones they voted down or did not vote for', () => {
    // A link nobody thought was good is noise, and the reader has to weigh every one
    // that is shown.
    expect(links.some((link) => link.from.verse === 2)).toBe(false);
  });

  it('drops a verse pointing at itself', () => {
    expect(links.some((link) => link.from.verse === 3)).toBe(false);
  });

  it('ignores a line it cannot read', () => {
    expect(links.some((link) => link.from.verse === 4)).toBe(false);
  });

  it('puts the strongest first', () => {
    const votes = links.map((link) => link.votes);
    expect(votes).toEqual([...votes].sort((a, b) => b - a));
  });

  it('caps how many one verse may have', () => {
    const many = ['From Verse\tTo Verse\tVotes'];
    for (let i = 1; i <= 40; i += 1) many.push(`Gen.1.1\tPs.${i}.1\t${i}`);
    const capped = parseCrossRefs(many.join('\n'), 8);
    expect(capped).toHaveLength(8);
    // The eight best, not the first eight read.
    expect(capped[0].votes).toBe(40);
    expect(capped[7].votes).toBe(33);
  });
});
