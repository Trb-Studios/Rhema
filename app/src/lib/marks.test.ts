import { describe, expect, it } from 'vitest';
import { markUp, nameOfId } from './marks';
import type { Mark } from './marks';

const marks = (...items: Mark[]) => items;

describe('marking names in a verse', () => {
  it('leaves a verse with no names alone', () => {
    const pieces = markUp('In the beginning God created the heaven and the earth.', []);
    expect(pieces).toEqual([
      { type: 'text', text: 'In the beginning God created the heaven and the earth.' },
    ]);
  });

  it('marks a name and keeps the words around it', () => {
    const pieces = markUp(
      'And Abram went up out of Egypt.',
      marks(['Abram', 'Abraham@Gen.11.26'], ['Egypt', 'Egypt@Gen.12.10', 'place']),
    );
    expect(pieces.map((piece) => piece.text).join('')).toBe('And Abram went up out of Egypt.');
    const marked = pieces.filter((piece) => piece.type === 'mark');
    expect(marked.map((piece) => piece.text)).toEqual(['Abram', 'Egypt']);
  });

  it('colours a place differently from a person', () => {
    const pieces = markUp(
      'Abram in Egypt',
      marks(['Abram', 'Abraham@Gen.11.26'], ['Egypt', 'Egypt@Gen.12.10', 'place']),
    );
    const marked = pieces.filter((piece) => piece.type === 'mark');
    expect(marked.map((piece) => piece.kind)).toEqual(['person', 'place']);
  });

  it('never marks a name inside a longer word', () => {
    // "Adam" must not light up inside "Adamah".
    const pieces = markUp('They came to Adamah that morning.', marks(['Adam', 'Adam@Gen.2.19']));
    expect(pieces.every((piece) => piece.type === 'text')).toBe(true);
  });

  it('prefers the longer name where two overlap', () => {
    const pieces = markUp(
      'He went to Bethlehemjudah.',
      marks(['Judah', 'Judah@Gen.29.35'], ['Bethlehemjudah', 'Bethlehem@Jdg.17.7', 'place']),
    );
    const marked = pieces.filter((piece) => piece.type === 'mark');
    expect(marked).toHaveLength(1);
    expect(marked[0].text).toBe('Bethlehemjudah');
  });

  it('marks every occurrence in the verse', () => {
    const pieces = markUp('Abram said, and Abram went.', marks(['Abram', 'Abraham@Gen.11.26']));
    expect(pieces.filter((piece) => piece.type === 'mark')).toHaveLength(2);
  });

  it('keeps the whole verse intact, in order', () => {
    const text = 'Now Sarai Abram’s wife bare him no children: and she had an handmaid.';
    const pieces = markUp(
      text,
      marks(['Sarai', 'Sarah@Gen.11.29'], ['Abram', 'Abraham@Gen.11.26']),
    );
    expect(pieces.map((piece) => piece.text).join('')).toBe(text);
  });

  it('offers both people where one spelling means two', () => {
    // John 19:25 has Mary the wife of Cleophas and Mary Magdalene, both written Mary.
    // Picking one would be a guess, so each occurrence carries both.
    const pieces = markUp(
      'Mary the wife of Cleophas, and Mary Magdalene.',
      marks(['Mary', 'Mary@Mat.27.56-Jhn'], ['Mary', 'Mary_Magdalene@Mat.27.56-Jhn']),
    );
    const marked = pieces.filter((piece) => piece.type === 'mark');
    expect(marked).toHaveLength(2);
    for (const piece of marked) {
      expect(piece.ids).toEqual(['Mary@Mat.27.56-Jhn', 'Mary_Magdalene@Mat.27.56-Jhn']);
    }
  });

  it('carries one person where the spelling is theirs alone', () => {
    const pieces = markUp('And Moses said', marks(['Moses', 'Moses@Exo.2.10-Rev']));
    const marked = pieces.filter((piece) => piece.type === 'mark');
    expect(marked[0].ids).toEqual(['Moses@Exo.2.10-Rev']);
  });

  it('matches a name however the verse capitalises it', () => {
    const pieces = markUp('THE LORD said unto Moses', marks(['Moses', 'Moses@Exo.2.10-Rev']));
    expect(pieces.filter((piece) => piece.type === 'mark')).toHaveLength(1);
  });
});

describe('naming someone with no record of their own', () => {
  it('reads the name out of the identifier', () => {
    expect(nameOfId('Mary_Magdalene@Mat.27.56-Jhn')).toBe('Mary Magdalene');
    expect(nameOfId('wife_of_Heli@Luk.1.5')).toBe('wife of Heli');
    expect(nameOfId('Aaron@Exo.4.14-Heb')).toBe('Aaron');
  });
});
