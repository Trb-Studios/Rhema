import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Book } from '../lib/bible';
import type { Sticky } from '../lib/stickies';
import { STICKY_COLOURS, STICKY_TONES, addSticky, useStickies } from '../lib/stickies';
import { spring, transition } from '../lib/motion';
import { PlusIcon, StickyIcon, TrashIcon } from './Icons';

/**
 * A book's sticky notes, as a little board of paper squares.
 *
 * Each sits at a slight angle, as real ones do, and straightens when you pick it up to
 * write. New notes drop onto the board; removed ones lift off it; the rest close the gap
 * by sliding rather than jumping.
 */
export function StickyBoard({
  book,
  chapter,
  verse,
  onOpenVerse,
}: {
  book: Book;
  chapter: number;
  verse: number | null;
  onOpenVerse: (chapter: number, verse?: number) => void;
}) {
  const { list, update, remove } = useStickies(book.id);
  const [focusId, setFocusId] = useState<string | null>(null);

  const create = () => {
    const id = addSticky(book.id, {
      anchor: { chapter, verse: verse ?? undefined },
    });
    setFocusId(id);
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="eyebrow">{book.name}</div>
        <span className="tabular" style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
          {list.length} {list.length === 1 ? 'note' : 'notes'}
        </span>
        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={spring.snappy}
          onClick={create}
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 28,
            padding: '0 10px',
            borderRadius: 7,
            background: 'var(--main-fill)',
            color: 'var(--main-on)',
            fontWeight: 600,
            fontSize: 12.5,
          }}
        >
          <PlusIcon size={14} />
          New note
        </motion.button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', margin: '12px -6px 0', padding: '6px 6px 24px' }}>
        {list.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 36,
              textAlign: 'center',
              color: 'var(--text-secondary)',
              padding: '0 18px',
            }}
          >
            <span style={{ display: 'inline-grid', color: 'var(--text-tan)' }}>
              <StickyIcon size={30} />
            </span>
            <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
              Notes here belong to all of {book.name}, so they stay put as you turn the pages.
              Select any words in the text to pin a note to them.
            </p>
          </motion.div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              alignItems: 'start',
            }}
          >
            <AnimatePresence initial={false}>
              {list.map((sticky) => (
                <StickyNote
                  key={sticky.id}
                  sticky={sticky}
                  focus={focusId === sticky.id}
                  onFocused={() => setFocusId(null)}
                  onChange={(text) => update(sticky.id, { text })}
                  onColour={(colour) => update(sticky.id, { colour })}
                  onRemove={() => remove(sticky.id)}
                  onOpen={() =>
                    sticky.anchor && onOpenVerse(sticky.anchor.chapter, sticky.anchor.verse)
                  }
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

/** A small, stable tilt per note, so the board looks hand-placed but never shuffles. */
function tiltOf(id: string): number {
  let hash = 0;
  for (const letter of id) hash = (hash * 31 + letter.charCodeAt(0)) | 0;
  return ((Math.abs(hash) % 50) / 50 - 0.5) * 3;
}

function StickyNote({
  sticky,
  focus,
  onFocused,
  onChange,
  onColour,
  onRemove,
  onOpen,
}: {
  sticky: Sticky;
  focus: boolean;
  onFocused: () => void;
  onChange: (text: string) => void;
  onColour: (colour: Sticky['colour']) => void;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const tone = STICKY_TONES[sticky.colour];
  const [editing, setEditing] = useState(false);
  const [hover, setHover] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const tilt = tiltOf(sticky.id);

  useEffect(() => {
    if (focus) {
      area.current?.focus();
      onFocused();
    }
  }, [focus, onFocused]);

  // The box grows with what is written in it, so a note never hides its own text.
  useEffect(() => {
    const element = area.current;
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${Math.max(64, element.scrollHeight)}px`;
  }, [sticky.text]);

  const anchor = sticky.anchor;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.6, y: -24, rotate: tilt * 4 }}
      animate={{
        opacity: 1,
        scale: editing ? 1.03 : 1,
        y: 0,
        rotate: editing ? 0 : tilt,
        zIndex: editing ? 2 : 1,
      }}
      exit={{ opacity: 0, scale: 0.7, y: -16, rotate: tilt * 3, transition: { duration: 0.18 } }}
      transition={{ ...spring.bouncy, layout: transition('smooth') }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      style={{
        position: 'relative',
        background: `linear-gradient(170deg, ${tone.fill}, color-mix(in srgb, ${tone.fill} 88%, ${tone.edge}))`,
        color: tone.ink,
        borderRadius: '3px 3px 14px 3px',
        padding: '12px 12px 10px',
        boxShadow: editing
          ? '0 18px 34px rgba(0,0,0,0.38), 0 2px 6px rgba(0,0,0,0.25)'
          : '0 6px 14px rgba(0,0,0,0.28), 0 1px 3px rgba(0,0,0,0.2)',
      }}
    >
      {/* The tape strip across the top. */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -7,
          left: '50%',
          width: 46,
          height: 14,
          translate: '-50% 0',
          rotate: `${-tilt * 2}deg`,
          background: 'rgba(255,255,255,0.35)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 2,
          backdropFilter: 'blur(2px)',
        }}
      />

      {anchor?.quote && (
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 12.5,
            lineHeight: 1.45,
            opacity: 0.75,
            marginBottom: 6,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          “{anchor.quote}”
        </p>
      )}

      <textarea
        ref={area}
        value={sticky.text}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        placeholder="Write a note…"
        aria-label="Sticky note"
        style={{
          width: '100%',
          minHeight: 64,
          border: 0,
          outline: 'none',
          resize: 'none',
          background: 'transparent',
          color: 'inherit',
          font: '500 13.5px/1.5 var(--font-ui)',
          padding: 0,
          overflow: 'hidden',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, minHeight: 22 }}>
        {anchor && (
          <button
            onClick={onOpen}
            className="tabular"
            style={{
              font: '700 10.5px var(--font-ui)',
              padding: '2px 7px',
              borderRadius: 99,
              background: 'rgba(0,0,0,0.08)',
              color: 'inherit',
              letterSpacing: '0.02em',
            }}
          >
            {anchor.chapter}
            {anchor.verse ? `:${anchor.verse}` : ''}
          </button>
        )}
        <span style={{ flex: 1 }} />
        <AnimatePresence>
          {(hover || editing) && (
            <motion.div
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.14 }}
              style={{ display: 'flex', alignItems: 'center', gap: 3 }}
            >
              {STICKY_COLOURS.map((colour) => (
                <button
                  key={colour}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onColour(colour)}
                  aria-label={`Make it ${colour}`}
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 99,
                    background: STICKY_TONES[colour].fill,
                    boxShadow:
                      colour === sticky.colour
                        ? `0 0 0 1.5px ${tone.ink}`
                        : `inset 0 0 0 1px rgba(0,0,0,0.25)`,
                  }}
                />
              ))}
              <button
                onMouseDown={(event) => event.preventDefault()}
                onClick={onRemove}
                aria-label="Delete note"
                style={{ display: 'grid', marginLeft: 3, color: 'inherit', opacity: 0.7 }}
              >
                <TrashIcon size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
