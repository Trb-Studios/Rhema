/**
 * Lining up two editions side by side.
 *
 * The editions do not agree on verse numbers. The Hebrew counts a psalm's title as
 * verse 1, so Psalm 51 runs a verse or two ahead of the English the whole way down.
 * The Greek rests on a different manuscript base, so a handful of verses the King James
 * carries — Acts 8:37, 1 John 5:7 — are not there at all.
 *
 * Rather than guess at a correspondence, rows are paired by verse number and a verse
 * with no counterpart is shown as a row with one side empty. A reader can see the gap
 * and judge it; a silent shift of everything below would be a lie told quietly.
 */

export type AlignedRow = {
  /** The verse number in the left edition, or null where it has nothing here. */
  left: number | null;
  /** The verse number in the right edition, or null where it has nothing here. */
  right: number | null;
  leftText: string;
  rightText: string;
};

type Side = { number: number; text: string };

/**
 * Pairs two chapters by verse number.
 *
 * Both lists are walked in order, taking the lower number first, so a verse missing
 * from one side leaves a gap rather than pulling the rest out of step.
 */
export function align(left: Side[], right: Side[]): AlignedRow[] {
  const rows: AlignedRow[] = [];
  let l = 0;
  let r = 0;

  while (l < left.length || r < right.length) {
    const nextLeft = left[l];
    const nextRight = right[r];

    if (!nextRight) {
      rows.push({ left: nextLeft.number, right: null, leftText: nextLeft.text, rightText: '' });
      l += 1;
    } else if (!nextLeft) {
      rows.push({ left: null, right: nextRight.number, leftText: '', rightText: nextRight.text });
      r += 1;
    } else if (nextLeft.number === nextRight.number) {
      rows.push({
        left: nextLeft.number,
        right: nextRight.number,
        leftText: nextLeft.text,
        rightText: nextRight.text,
      });
      l += 1;
      r += 1;
    } else if (nextLeft.number < nextRight.number) {
      rows.push({ left: nextLeft.number, right: null, leftText: nextLeft.text, rightText: '' });
      l += 1;
    } else {
      rows.push({ left: null, right: nextRight.number, leftText: '', rightText: nextRight.text });
      r += 1;
    }
  }

  return rows;
}

/** How many rows have a verse on one side only, for the note under the heading. */
export function gapsIn(rows: AlignedRow[]): number {
  return rows.filter((row) => row.left === null || row.right === null).length;
}

/**
 * Describes the gaps in a sentence, or returns null when the two line up.
 *
 * Said once at the top rather than marked on every row, because a chapter where the
 * numbering runs ahead throughout would otherwise carry a warning on every line.
 */
export function describeGaps(
  rows: AlignedRow[],
  leftName: string,
  rightName: string,
): string | null {
  const onlyLeft = rows.filter((row) => row.right === null).length;
  const onlyRight = rows.filter((row) => row.left === null).length;
  if (onlyLeft === 0 && onlyRight === 0) return null;

  const parts: string[] = [];
  if (onlyLeft > 0) {
    parts.push(`${onlyLeft} ${onlyLeft === 1 ? 'verse' : 'verses'} only in the ${leftName}`);
  }
  if (onlyRight > 0) {
    parts.push(`${onlyRight} ${onlyRight === 1 ? 'verse' : 'verses'} only in the ${rightName}`);
  }
  return `${parts.join(', ')}. The editions number verses differently; rows are paired by number, so a verse missing from one side is shown as a gap rather than shifting the rest.`;
}
