import { describe, expect, it } from 'vitest';
import { ACROSTIC_LETTERS, PSALM_119_HEADINGS, splitHeading } from './acrostic.mjs';

describe('the alphabet', () => {
  it('has all twenty-two letters', () => {
    expect(ACROSTIC_LETTERS).toHaveLength(22);
  });

  it('runs in alphabetical order, with no letter twice', () => {
    const letters = ACROSTIC_LETTERS.map(([letter]) => letter);
    expect(new Set(letters).size).toBe(22);
    const codes = letters.map((letter) => letter.codePointAt(0));
    expect([...codes].sort((a, b) => a - b)).toEqual(codes);
  });

  it('uses no final forms, which never begin a word', () => {
    const finals = ['ך', 'ם', 'ן', 'ף', 'ץ'];
    for (const [letter] of ACROSTIC_LETTERS) expect(finals).not.toContain(letter);
  });

  it('spells the names as the KJV does', () => {
    const names = ACROSTIC_LETTERS.map(([, name]) => name);
    expect(names[5]).toBe('VAU');
    expect(names[9]).toBe('JOD');
    expect(names[20]).toBe('SCHIN');
    expect(names.every((name) => /^[A-Z]+$/.test(name))).toBe(true);
  });
});

describe('where the headings fall', () => {
  it('opens a section every eighth verse, 1 to 169', () => {
    expect([...PSALM_119_HEADINGS.keys()]).toEqual(
      Array.from({ length: 22 }, (_, index) => index * 8 + 1),
    );
  });

  it('pairs the letter with its name', () => {
    expect(PSALM_119_HEADINGS.get(1)).toBe('א ALEPH');
    expect(PSALM_119_HEADINGS.get(105)).toBe('נ NUN');
    expect(PSALM_119_HEADINGS.get(169)).toBe('ת TAU');
  });

  it('covers the psalm to its last verse and no further', () => {
    expect(PSALM_119_HEADINGS.has(176)).toBe(false);
    expect(PSALM_119_HEADINGS.has(177)).toBe(false);
  });
});

describe('splitting a verse', () => {
  it('heads the first verse of a section', () => {
    expect(splitHeading('Psalms', 119, 9, 'Wherewithal shall a young man')).toEqual({
      heading: 'ב BETH',
      text: 'Wherewithal shall a young man',
    });
  });

  it('leaves the other seven alone', () => {
    expect(splitHeading('Psalms', 119, 10, 'With my whole heart')).toEqual({
      heading: null,
      text: 'With my whole heart',
    });
  });

  it('strips a heading an edition folded into the verse', () => {
    expect(splitHeading('Psalms', 119, 105, 'נ NUN. Thy word is a lamp')).toEqual({
      heading: 'נ NUN',
      text: 'Thy word is a lamp',
    });
  });

  it('heads the section even where the edition left the letter out', () => {
    expect(splitHeading('Psalms', 119, 105, 'Thy word is a lamp').heading).toBe('נ NUN');
  });

  it('leaves every other psalm unheaded', () => {
    expect(splitHeading('Psalms', 118, 1, 'O give thanks unto the LORD').heading).toBe(null);
    expect(splitHeading('Psalms', 120, 1, 'In my distress I cried').heading).toBe(null);
  });

  it('leaves the rest of the Bible alone', () => {
    expect(splitHeading('Genesis', 1, 1, 'In the beginning')).toEqual({
      heading: null,
      text: 'In the beginning',
    });
  });

  it('does not mistake a verse opening with a capitalised word', () => {
    expect(splitHeading('John', 11, 35, 'Jesus wept.').heading).toBe(null);
  });
});
