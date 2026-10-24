import { describe, expect, it } from 'vitest';
import type { Phrase } from './phrases';
import { ordered, rangesIn, segment } from './phrases';
import { shortSenses } from './words';

const phrase = (overrides: Partial<Phrase>): Phrase => ({
  id: 'x',
  bookId: 1,
  chapter: 1,
  from: { verse: 3, offset: 4 },
  to: { verse: 3, offset: 12 },
  colour: 0,
  text: '',
  created: '',
  ...overrides,
});

describe('phrase highlights', () => {
  it('puts the ends in reading order whichever way the selection was dragged', () => {
    expect(ordered({ verse: 5, offset: 2 }, { verse: 3, offset: 9 })).toEqual([
      { verse: 3, offset: 9 },
      { verse: 5, offset: 2 },
    ]);
    expect(ordered({ verse: 3, offset: 9 }, { verse: 3, offset: 2 })[0].offset).toBe(2);
  });

  it('gives a verse in the middle of a highlight its whole length', () => {
    const across = phrase({ from: { verse: 2, offset: 10 }, to: { verse: 4, offset: 5 } });
    expect(rangesIn([across], 1, 1, 2, 60)).toEqual([{ from: 10, to: 60, colour: 0, id: 'x' }]);
    expect(rangesIn([across], 1, 1, 3, 40)).toEqual([{ from: 0, to: 40, colour: 0, id: 'x' }]);
    expect(rangesIn([across], 1, 1, 4, 40)).toEqual([{ from: 0, to: 5, colour: 0, id: 'x' }]);
    expect(rangesIn([across], 1, 1, 5, 40)).toEqual([]);
  });

  it('ignores highlights in another chapter or book', () => {
    expect(rangesIn([phrase({ chapter: 2 })], 1, 1, 3, 40)).toEqual([]);
    expect(rangesIn([phrase({ bookId: 2 })], 1, 1, 3, 40)).toEqual([]);
  });

  it('cuts a run of text exactly at the highlight boundaries', () => {
    const text = 'And God said, Let there be light';
    const pieces = segment(text, 0, [{ from: 4, to: 12, colour: 3, id: 'a' }]);
    expect(pieces.map((piece) => piece.text)).toEqual(['And ', 'God said', ', Let there be light']);
    expect(pieces[1]).toMatchObject({ colour: 3, phrase: 'a', offset: 4 });
    expect(pieces[0].colour).toBeUndefined();
  });

  it('measures a run that starts part way through the verse from the verse start', () => {
    // A run of text after a marked name begins at character 20 of the verse.
    const pieces = segment('created the heaven', 20, [{ from: 28, to: 31, colour: 1, id: 'b' }]);
    expect(pieces.map((piece) => [piece.text, piece.offset])).toEqual([
      ['created ', 20],
      ['the', 28],
      [' heaven', 31],
    ]);
  });

  it('draws the newer of two overlapping highlights', () => {
    const pieces = segment('abcdefghij', 0, [
      { from: 0, to: 8, colour: 1, id: 'old' },
      { from: 4, to: 10, colour: 2, id: 'new' },
    ]);
    expect(pieces.map((piece) => [piece.text, piece.phrase])).toEqual([
      ['abcd', 'old'],
      ['efgh', 'new'],
      ['ij', 'new'],
    ]);
  });
});

describe('hover meanings', () => {
  it('takes the first numbered sense of a Hebrew entry', () => {
    expect(
      shortSenses(
        'hebrew',
        '1) to create, shape, form 1a) (Qal) to shape, fashion, create (always with God as subject)',
      ),
    ).toBe('to create, shape, form');
  });

  it('strips the Septuagint note and references from a Greek entry', () => {
    expect(
      shortSenses(
        'greek',
        'βασιλεύς , -έως, ὁ, [in LXX chiefly for מֶלֶךְ ;] a king : Mat.1:6 2:1 ; used by courtesy',
      ),
    ).toBe('a king');
    expect(
      shortSenses(
        'greek',
        'προσ-κυνέω , -ῶ (κυνέω, to kiss), [in LXX chiefly for שָׁחָה hith. ;] to make obeisance, do reverence to, worship ; __(a) prop.',
      ),
    ).toBe('to make obeisance, do reverence to, worship');
  });

  it('gives nothing rather than a paragraph', () => {
    expect(shortSenses('greek', 'Of that by which the inward thought is expressed in many ways and many forms and many more words than fit')).toBe('');
  });
});
