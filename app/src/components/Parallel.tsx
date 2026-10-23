import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Book, Verse } from '../lib/bible';
import { chapter as loadChapter } from '../lib/bible';
import type { EditionId } from '../lib/editions';
import { editionById } from '../lib/editions';
import { align, describeGaps } from '../lib/parallel';
import type { AlignedRow } from '../lib/parallel';
import { transition } from '../lib/motion';

/**
 * Two editions side by side, paired verse by verse.
 *
 * Switching between editions makes you hold one in your head while you read the other.
 * Side by side is what a reader comparing a translation with its original actually
 * wants, and it is where the verse numbering differing between the two stops being a
 * footnote and starts being visible.
 */
export function Parallel({
  book,
  number,
  left,
  right,
  verses,
  onSelect,
  selected,
}: {
  book: Book;
  number: number;
  left: EditionId;
  right: EditionId;
  /** The left edition's verses, already loaded by the reader. */
  verses: Verse[];
  onSelect: (verse: number | null) => void;
  selected: number | null;
}) {
  const [rows, setRows] = useState<AlignedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const leftEdition = editionById(left);
  const rightEdition = editionById(right);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void loadChapter(book, number, right).then((other) => {
      if (cancelled) return;
      setRows(
        align(
          verses.map((verse) => ({ number: verse.number, text: verse.text })),
          other.map((verse) => ({ number: verse.number, text: verse.text })),
        ),
      );
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [book, number, right, verses]);

  const note = describeGaps(rows, leftEdition.title, rightEdition.title);

  if (loading) {
    return (
      <p style={{ color: 'var(--text-secondary)', padding: '8px 0' }}>Loading the other edition…</p>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={transition('smooth')}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          paddingBottom: 10,
          marginBottom: 6,
          borderBottom: '1px solid var(--line-default)',
          font: '600 11px var(--font-ui)',
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
        }}
      >
        <span>{leftEdition.title}</span>
        <span dir={rightEdition.direction} style={{ textAlign: 'start' }}>
          {rightEdition.title}
        </span>
      </div>

      {note && (
        <p
          style={{
            margin: '10px 0 14px',
            fontSize: 12,
            lineHeight: 1.5,
            color: 'var(--text-faint)',
          }}
        >
          {note}
        </p>
      )}

      <div>
        {rows.map((row, index) => {
          const key = `${row.left ?? 'x'}-${row.right ?? 'x'}-${index}`;
          const isSelected = row.left !== null && row.left === selected;

          return (
            <div
              key={key}
              onClick={() => onSelect(isSelected ? null : row.left)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 24,
                padding: '9px 10px',
                margin: '0 -10px',
                borderRadius: 8,
                cursor: row.left === null ? 'default' : 'pointer',
                background: isSelected ? 'var(--bg-selected)' : undefined,
                // A row present on one side only is tinted, so the gap reads as a gap
                // rather than as a verse that failed to load.
                outline:
                  row.left === null || row.right === null
                    ? '1px dashed var(--line-strong)'
                    : undefined,
                outlineOffset: -1,
              }}
            >
              <Side
                number={row.left}
                text={row.leftText}
                edition={leftEdition}
                missing={`Not in the ${leftEdition.title}`}
              />
              <Side
                number={row.right}
                text={row.rightText}
                edition={rightEdition}
                missing={`Not in the ${rightEdition.title}`}
              />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function Side({
  number,
  text,
  edition,
  missing,
}: {
  number: number | null;
  text: string;
  edition: ReturnType<typeof editionById>;
  missing: string;
}) {
  if (number === null) {
    return (
      <span style={{ color: 'var(--text-faint)', fontSize: 12, alignSelf: 'center' }}>
        {missing}
      </span>
    );
  }

  return (
    <span
      dir={edition.direction}
      className="selectable"
      style={{
        fontFamily: edition.font,
        fontSize: 'var(--reading-size, 19px)',
        lineHeight: 'var(--reading-line, 1.7)',
        textAlign: 'start',
        minWidth: 0,
      }}
    >
      <span
        className="tabular"
        style={{
          font: '600 0.58em var(--font-ui)',
          verticalAlign: 'super',
          color: 'var(--text-faint)',
          marginInlineEnd: '0.3em',
        }}
      >
        {number}
      </span>
      {text}
    </span>
  );
}
