import { useCallback, useEffect, useRef } from 'react';
import type { Book, Verse } from '../lib/bible';
import type { BookMarks } from '../lib/marks';
import { markUp } from '../lib/marks';
import type { Highlight } from '../lib/highlights';
import { HIGHLIGHTS, HIGHLIGHT_OPACITY } from '../lib/highlights';
import type { Phrase, Point } from '../lib/phrases';
import { ordered, rangesIn, segment } from '../lib/phrases';
import type { Anchored } from './MarkPopover';

export type TextSelection = {
  from: Point;
  to: Point;
  text: string;
  /** Where the selection sits on screen, for the toolbar that offers to highlight it. */
  rect: { left: number; top: number; width: number; bottom: number };
};

/**
 * The King James text: names marked, highlights drawn, and any stretch of it selectable.
 *
 * Every run of text carries the verse it belongs to and the character it starts at.
 * That is what turns a selection made with the mouse into a highlight that lands on the
 * same words next time, whatever the window size, font or zoom.
 */
export function KjvText({
  book,
  number,
  verses,
  marks,
  phrases,
  verseNumbers,
  selected,
  spoken,
  colourOf,
  onSelectVerse,
  onMark,
  onSelectText,
  onPhrase,
}: {
  book: Book;
  number: number;
  verses: Verse[];
  marks: BookMarks;
  phrases: Phrase[];
  verseNumbers: boolean;
  selected: number | null;
  spoken: number | null;
  colourOf: (bookId: number, chapter: number, verse: number) => Highlight | undefined;
  onSelectVerse: (verse: number | null) => void;
  onMark: (anchored: Anchored) => void;
  onSelectText: (selection: TextSelection | null) => void;
  onPhrase: (id: string, rect: DOMRect) => void;
}) {
  const container = useRef<HTMLDivElement>(null);

  const report = useCallback(() => {
    const selection = window.getSelection();
    const root = container.current;
    if (!selection || selection.isCollapsed || selection.rangeCount === 0 || !root) {
      onSelectText(null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
      onSelectText(null);
      return;
    }
    const start = pointAt(range.startContainer, range.startOffset);
    const end = pointAt(range.endContainer, range.endOffset);
    if (!start || !end) {
      onSelectText(null);
      return;
    }
    const [from, to] = ordered(start, end);
    if (from.verse === to.verse && from.offset === to.offset) {
      onSelectText(null);
      return;
    }

    const parts: string[] = [];
    for (const verse of verses) {
      if (verse.number < from.verse || verse.number > to.verse) continue;
      const a = verse.number === from.verse ? from.offset : 0;
      const b = verse.number === to.verse ? to.offset : verse.text.length;
      parts.push(verse.text.slice(a, b));
    }
    const text = parts.join(' ').replace(/\s+/g, ' ').trim();
    if (!text) {
      onSelectText(null);
      return;
    }

    const box = range.getBoundingClientRect();
    onSelectText({
      from,
      to,
      text,
      rect: { left: box.left, top: box.top, width: box.width, bottom: box.bottom },
    });
  }, [verses, onSelectText]);

  // A selection made with the keyboard, or cleared by clicking elsewhere, is noticed
  // too, not only one made by dragging.
  useEffect(() => {
    let timer: number | undefined;
    const onChange = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) onSelectText(null);
      }, 60);
    };
    document.addEventListener('selectionchange', onChange);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('selectionchange', onChange);
    };
  }, [onSelectText]);

  return (
    <div
      ref={container}
      className="reading selectable"
      onPointerUp={() => window.setTimeout(report, 0)}
      onKeyUp={(event) => {
        if (event.shiftKey) report();
      }}
      style={{ textAlign: 'start' }}
    >
      {verses.map((verse) => {
        const chosen = colourOf(book.id, number, verse.number);
        const isSelected = selected === verse.number;
        const beingSpoken = spoken === verse.number;
        const ranges = rangesIn(phrases, book.id, number, verse.number, verse.text.length);
        const pieces = markUp(verse.text, marks[`${number}:${verse.number}`]);

        let at = 0;
        const rendered = pieces.map((piece, index) => {
          const offset = at;
          at += piece.text.length;
          const segments = segment(piece.text, offset, ranges);
          const inner = segments.map((seg) =>
            seg.colour === undefined ? (
              <span key={seg.offset} data-v={verse.number} data-o={seg.offset}>
                {seg.text}
              </span>
            ) : (
              <mark
                key={seg.offset}
                data-v={verse.number}
                data-o={seg.offset}
                className="phrase-mark"
                onClick={(event) => {
                  const selection = window.getSelection();
                  if (selection && !selection.isCollapsed) return;
                  event.stopPropagation();
                  if (seg.phrase) onPhrase(seg.phrase, event.currentTarget.getBoundingClientRect());
                }}
                style={{
                  color: 'inherit',
                  backgroundColor: 'transparent',
                  backgroundImage: `linear-gradient(color-mix(in srgb, ${HIGHLIGHTS[seg.colour].colour} var(--phrase-mix, 55%), transparent), color-mix(in srgb, ${HIGHLIGHTS[seg.colour].colour} var(--phrase-mix, 55%), transparent))`,
                  padding: '0.04em 0',
                }}
              >
                {seg.text}
              </mark>
            ),
          );

          return piece.type === 'text' ? (
            <span key={index}>{inner}</span>
          ) : (
            <button
              key={index}
              onClick={(event) => {
                const selection = window.getSelection();
                if (selection && !selection.isCollapsed) return;
                const box = event.currentTarget.getBoundingClientRect();
                onMark({
                  ids: piece.ids,
                  text: piece.text,
                  x: box.left + box.width / 2,
                  y: box.bottom,
                });
              }}
              className="name-mark"
              style={{
                font: 'inherit',
                color: piece.kind === 'place' ? 'var(--mark-place)' : 'var(--mark-name)',
                borderBottom: '1.5px solid color-mix(in srgb, currentColor 40%, transparent)',
                borderRadius: 2,
                userSelect: 'text',
              }}
            >
              {inner}
            </button>
          );
        });

        return (
          <span key={verse.number}>
            {verse.heading && <SectionHeading heading={verse.heading} first={verse.number === 1} />}
            <span
              id={`verse-${verse.number}`}
              ref={
                beingSpoken
                  ? (node) => node?.scrollIntoView({ block: 'center', behavior: 'smooth' })
                  : undefined
              }
              style={{
                borderRadius: 3,
                boxDecorationBreak: 'clone',
                WebkitBoxDecorationBreak: 'clone',
                // The verse being read aloud is tinted so the eye can follow the voice,
                // over any highlight already on it.
                background: beingSpoken
                  ? 'color-mix(in srgb, var(--main-fill) 30%, transparent)'
                  : chosen
                    ? `color-mix(in srgb, ${chosen.colour} ${HIGHLIGHT_OPACITY * 100}%, transparent)`
                    : undefined,
                outline: isSelected ? '2px solid var(--focus-ring)' : undefined,
                outlineOffset: 1,
                transition: 'background var(--dur-base) var(--ease-smooth)',
              }}
            >
              {verseNumbers && (
                <button
                  data-v={verse.number}
                  data-o={0}
                  data-n=""
                  onClick={() => onSelectVerse(isSelected ? null : verse.number)}
                  aria-label={`Select verse ${verse.number}`}
                  className="tabular"
                  style={{
                    font: '600 0.58em var(--font-ui)',
                    verticalAlign: 'super',
                    color: 'var(--text-faint)',
                    margin: '0 0.3em 0 0',
                    userSelect: 'none',
                  }}
                >
                  {verse.number}
                </button>
              )}
              {rendered}
              <span data-v={verse.number} data-o={verse.text.length} data-n="">
                {' '}
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

/**
 * Where in the text a selection boundary falls, as a verse and a character within it.
 *
 * A boundary inside a verse number or the space after a verse is pinned to that run's
 * own position, since neither is part of the verse's words.
 */
function pointAt(node: Node, offset: number): Point | null {
  const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
  let holder = element?.closest<HTMLElement>('[data-v]') ?? null;

  // A boundary on an element rather than in text, as when a drag ends past a line's end:
  // look at the child it points to.
  if (!holder && node.nodeType !== Node.TEXT_NODE) {
    const child = (node as Element).childNodes[Math.min(offset, node.childNodes.length - 1)];
    const inside =
      child && child.nodeType === Node.ELEMENT_NODE
        ? ((child as Element).querySelector<HTMLElement>('[data-v]') ??
          (child as Element).closest<HTMLElement>('[data-v]'))
        : null;
    holder = inside;
    if (holder) return { verse: Number(holder.dataset.v), offset: Number(holder.dataset.o ?? 0) };
  }
  if (!holder) return null;

  const verse = Number(holder.dataset.v);
  const base = Number(holder.dataset.o ?? 0);
  if (holder.dataset.n !== undefined || node.nodeType !== Node.TEXT_NODE) {
    return { verse, offset: base };
  }
  return { verse, offset: base + offset };
}

/**
 * The letter standing over a section of an acrostic psalm.
 *
 * Psalm 119 is twenty-two eight-verse sections, each opening with the next letter of
 * the Hebrew alphabet. Set at the same size as the surrounding label the letter is
 * unreadable — Hebrew needs the height — so the letter is set large in the Hebrew face
 * and its name kept small beside it, with a rule running out to the margin the way a
 * printed Bible sets a section break.
 */
function SectionHeading({ heading, first }: { heading: string; first: boolean }) {
  // "א ALEPH" — the letter, then the name the KJV gives it.
  const space = heading.indexOf(' ');
  const letter = space === -1 ? heading : heading.slice(0, space);
  const name = space === -1 ? '' : heading.slice(space + 1);

  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginTop: first ? 0 : '1.6em',
        marginBottom: '0.5em',
        userSelect: 'none',
      }}
      role="presentation"
    >
      <span
        lang="he"
        dir="rtl"
        style={{
          font: `400 24px var(--font-hebrew)`,
          lineHeight: 1,
          color: 'var(--text-tan)',
        }}
      >
        {letter}
      </span>
      {name && (
        <span
          style={{
            font: '600 11px var(--font-ui)',
            letterSpacing: '0.1em',
            color: 'var(--text-secondary)',
          }}
        >
          {name}
        </span>
      )}
      <span style={{ flex: 1, height: 1, background: 'var(--line-default)' }} />
    </span>
  );
}
