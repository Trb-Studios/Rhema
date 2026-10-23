import { describe, expect, it } from 'vitest';
import { format, reference } from './copy';
import { editionById } from './editions';

const verse = {
  book: 'John',
  chapter: 3,
  verse: 16,
  text: 'For God so loved the world, that he gave his only begotten Son.',
};

describe('format', () => {
  it('puts the reference under the words', () => {
    expect(format(verse, editionById('kjv'))).toBe(
      'For God so loved the world, that he gave his only begotten Son.\n— John 3:16 (King James Version)',
    );
  });

  it('names the edition the wording came from', () => {
    const greek = format({ ...verse, text: 'Ὁλόγος' }, editionById('greek'));
    expect(greek).toContain('SBL Greek New Testament');
    expect(greek).not.toContain('King James');
  });

  it('trims stray space around the words', () => {
    const out = format({ ...verse, text: '  Jesus wept.  ' }, editionById('kjv'));
    expect(out.startsWith('Jesus wept.')).toBe(true);
    expect(out).toContain('Jesus wept.\n');
  });

  it('handles a numbered book', () => {
    expect(
      format({ ...verse, book: '1 Corinthians', chapter: 13, verse: 4 }, editionById('kjv')),
    ).toContain('1 Corinthians 13:4');
  });
});

describe('reference', () => {
  it('reads as people write it', () => {
    expect(reference(verse)).toBe('John 3:16');
  });
});
