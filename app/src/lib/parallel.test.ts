import { describe, expect, it } from 'vitest';
import { align, describeGaps, gapsIn } from './parallel';

const verses = (...numbers: number[]) => numbers.map((number) => ({ number, text: `v${number}` }));

describe('align', () => {
  it('pairs two chapters that agree', () => {
    const rows = align(verses(1, 2, 3), verses(1, 2, 3));
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.left === row.right)).toBe(true);
  });

  it('leaves a gap where the right side is missing a verse', () => {
    // Acts 8:37 is in the King James and not in the SBL Greek.
    const rows = align(verses(36, 37, 38), verses(36, 38));
    expect(rows).toHaveLength(3);
    expect(rows[1]).toMatchObject({ left: 37, right: null });
    // The verse after the gap must still be paired, not shifted.
    expect(rows[2]).toMatchObject({ left: 38, right: 38 });
  });

  it('leaves a gap where the left side is missing a verse', () => {
    const rows = align(verses(1, 3), verses(1, 2, 3));
    expect(rows[1]).toMatchObject({ left: null, right: 2 });
    expect(rows[2]).toMatchObject({ left: 3, right: 3 });
  });

  it('keeps the rest in step when one side starts a verse ahead', () => {
    // A psalm whose Hebrew counts the title as verse 1.
    const rows = align(verses(1, 2, 3), verses(2, 3, 4));
    expect(rows[0]).toMatchObject({ left: 1, right: null });
    expect(rows[1]).toMatchObject({ left: 2, right: 2 });
    expect(rows[3]).toMatchObject({ left: null, right: 4 });
  });

  it('carries the text across', () => {
    const rows = align([{ number: 1, text: 'In the beginning' }], [{ number: 1, text: 'Ἐν ἀρχῇ' }]);
    expect(rows[0].leftText).toBe('In the beginning');
    expect(rows[0].rightText).toBe('Ἐν ἀρχῇ');
  });

  it('handles one side being empty', () => {
    expect(align(verses(1, 2), [])).toHaveLength(2);
    expect(align([], verses(1, 2))).toHaveLength(2);
    expect(align([], [])).toEqual([]);
  });

  it('never loses a verse', () => {
    const left = verses(1, 2, 4, 5, 9);
    const right = verses(2, 3, 4, 7);
    const rows = align(left, right);
    expect(rows.filter((row) => row.left !== null)).toHaveLength(left.length);
    expect(rows.filter((row) => row.right !== null)).toHaveLength(right.length);
  });

  it('keeps every row in ascending order', () => {
    const rows = align(verses(1, 2, 4, 5, 9), verses(2, 3, 4, 7));
    const numbers = rows.map((row) => row.left ?? row.right ?? 0);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  });
});

describe('gapsIn', () => {
  it('counts rows with one side empty', () => {
    expect(gapsIn(align(verses(1, 2, 3), verses(1, 3)))).toBe(1);
    expect(gapsIn(align(verses(1, 2), verses(1, 2)))).toBe(0);
  });
});

describe('describeGaps', () => {
  it('says nothing when the two line up', () => {
    expect(describeGaps(align(verses(1, 2), verses(1, 2)), 'King James', 'Greek')).toBeNull();
  });

  it('names the side a verse is missing from', () => {
    const text = describeGaps(align(verses(1, 2, 3), verses(1, 3)), 'King James', 'Greek');
    expect(text).toContain('1 verse only in the King James');
  });

  it('counts both sides', () => {
    const text = describeGaps(align(verses(1, 2), verses(1, 3)), 'King James', 'Greek');
    expect(text).toContain('1 verse only in the King James');
    expect(text).toContain('1 verse only in the Greek');
  });

  it('says a gap is a gap rather than a shift', () => {
    const text = describeGaps(align(verses(1, 2), verses(1)), 'King James', 'Greek');
    expect(text).toContain('gap');
  });
});
