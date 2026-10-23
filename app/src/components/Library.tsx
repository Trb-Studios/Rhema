import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Book } from '../lib/bible';
import { byBook, colourName, coloursUsed, countKinds, filter, gather } from '../lib/library';
import type { Entry, EntryKind } from '../lib/library';
import { HIGHLIGHTS, useHighlights } from '../lib/highlights';
import { useNoteIndex } from '../lib/notes';
import { useSaved } from '../lib/saved';
import { sheetVariants, spring, transition } from '../lib/motion';
import { BookmarkIcon, CloseIcon, HighlightIcon, NoteIcon, SearchIcon } from './Icons';

/**
 * Everything you have marked, in one place.
 *
 * Until this existed a note was reachable only from the chapter it was written on, and
 * a highlight only by happening to scroll past it. The whole point of the app is
 * keeping what you read, so what you keep has to be findable.
 */
export function Library({
  open,
  books,
  onClose,
  onGo,
}: {
  open: boolean;
  books: Book[];
  onClose: () => void;
  onGo: (bookId: number, chapter: number, verse?: number) => void;
}) {
  const notes = useNoteIndex();
  const { marks } = useHighlights();
  const { saved } = useSaved();

  const [kinds, setKinds] = useState<EntryKind[]>([]);
  const [colour, setColour] = useState<number | undefined>(undefined);
  const [query, setQuery] = useState('');

  const all = useMemo(() => gather({ books, notes, marks, saved }), [books, notes, marks, saved]);
  const shown = useMemo(() => filter(all, { kinds, colour, query }), [all, kinds, colour, query]);
  const counts = useMemo(() => countKinds(all), [all]);
  const colours = useMemo(() => coloursUsed(all), [all]);
  const groups = useMemo(() => byBook(shown), [shown]);

  // Escape closes it wherever the focus is, not only when it is inside the dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function toggleKind(kind: EntryKind) {
    setKinds((current) =>
      current.includes(kind) ? current.filter((one) => one !== kind) : [...current, kind],
    );
    // A colour only narrows highlights, so it stops meaning anything elsewhere.
    if (kind !== 'highlight') setColour(undefined);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70,
            background: 'rgba(23, 20, 15, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'grid',
            alignItems: 'start',
            justifyItems: 'center',
            paddingTop: '7vh',
          }}
        >
          <motion.div
            variants={sheetVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition('smooth')}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Your library"
            style={{
              width: 'min(820px, calc(100vw - 32px))',
              height: 'min(78vh, 760px)',
              display: 'grid',
              gridTemplateRows: 'auto auto minmax(0, 1fr)',
              background: 'var(--bg-card)',
              border: '1px solid var(--line-default)',
              borderRadius: 16,
              boxShadow: 'var(--shadow-shell)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '16px 20px 14px',
              }}
            >
              <h2 style={{ fontSize: 21 }}>Everything you have marked</h2>
              <span style={{ color: 'var(--text-faint)', fontSize: 13 }} className="tabular">
                {all.length}
              </span>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  marginLeft: 'auto',
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--text-secondary)',
                }}
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                padding: '0 20px 14px',
                borderBottom: '1px solid var(--line-default)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flex: 1,
                  minWidth: 180,
                  padding: '7px 11px',
                  borderRadius: 9,
                  background: 'var(--bg-sunken)',
                  color: 'var(--text-secondary)',
                }}
              >
                <SearchIcon size={15} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search what you have kept"
                  aria-label="Search what you have kept"
                  style={{
                    flex: 1,
                    border: 0,
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              {(
                [
                  ['note', 'Notes', counts.note, <NoteIcon key="n" size={14} />],
                  [
                    'highlight',
                    'Highlights',
                    counts.highlight,
                    <HighlightIcon key="h" size={14} />,
                  ],
                  ['saved', 'Saved', counts.saved, <BookmarkIcon key="s" size={14} />],
                ] as const
              ).map(([kind, label, count, icon]) => (
                <Chip
                  key={kind}
                  on={kinds.includes(kind)}
                  onClick={() => toggleKind(kind)}
                  disabled={count === 0}
                >
                  {icon}
                  {label}
                  <span className="tabular" style={{ opacity: 0.6 }}>
                    {count}
                  </span>
                </Chip>
              ))}
            </div>

            {colours.length > 0 && (kinds.length === 0 || kinds.includes('highlight')) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px 0',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-faint)', marginRight: 2 }}>
                  Colour
                </span>
                {colours.map(({ index, count }) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.15 }}
                    transition={spring.snappy}
                    onClick={() => setColour(colour === index ? undefined : index)}
                    aria-label={`${colourName(index)}, ${count} ${count === 1 ? 'verse' : 'verses'}`}
                    aria-pressed={colour === index}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: HIGHLIGHTS[index]?.colour,
                      border: '2px solid var(--bg-card)',
                      boxShadow:
                        colour === index
                          ? '0 0 0 2px var(--text-primary)'
                          : '0 0 0 1px var(--line-default)',
                    }}
                  />
                ))}
                {colour !== undefined && (
                  <button
                    onClick={() => setColour(undefined)}
                    style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 4 }}
                  >
                    clear
                  </button>
                )}
              </div>
            )}

            <div style={{ overflowY: 'auto', padding: '6px 20px 20px' }}>
              {all.length === 0 ? (
                <Empty
                  title="Nothing kept yet"
                  body="Highlight a verse, write a note on a chapter, or save a verse, and it will be here."
                />
              ) : shown.length === 0 ? (
                <Empty
                  title="Nothing matches"
                  body="Try a different word, or clear the filters above."
                />
              ) : (
                groups.map((group) => (
                  <section key={group.bookId}>
                    <h3
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        margin: '14px 0 6px',
                        padding: '6px 0',
                        background: 'var(--bg-card)',
                        font: '600 11px var(--font-ui)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {group.book}
                    </h3>
                    {group.entries.map((entry, index) => (
                      <Row
                        key={`${entry.kind}-${entry.chapter}-${entry.verse ?? 0}-${index}`}
                        entry={entry}
                        onGo={() => {
                          onGo(entry.bookId, entry.chapter, entry.verse);
                          onClose();
                        }}
                      />
                    ))}
                  </section>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ entry, onGo }: { entry: Entry; onGo: () => void }) {
  const reference = `${entry.chapter}${entry.verse ? `:${entry.verse}` : ''}`;

  return (
    <button
      onClick={onGo}
      style={{
        display: 'flex',
        gap: 12,
        width: '100%',
        textAlign: 'start',
        padding: '10px 11px',
        margin: '0 -11px',
        borderRadius: 10,
        alignItems: 'flex-start',
      }}
      className="library-row"
    >
      <span
        style={{
          flex: 'none',
          width: 4,
          alignSelf: 'stretch',
          borderRadius: 99,
          minHeight: 20,
          background:
            entry.kind === 'highlight' && entry.colour !== undefined
              ? HIGHLIGHTS[entry.colour]?.colour
              : 'var(--line-strong)',
        }}
      />
      <span style={{ minWidth: 0, flex: 1 }}>
        <span
          className="tabular"
          style={{ font: '600 12px var(--font-ui)', color: 'var(--text-tan)' }}
        >
          {entry.book} {reference}
        </span>
        <span
          style={{
            marginInlineStart: 8,
            fontSize: 11,
            color: 'var(--text-faint)',
          }}
        >
          {entry.kind === 'note'
            ? 'note'
            : entry.kind === 'saved'
              ? 'saved'
              : colourName(entry.colour ?? 0).toLowerCase()}
        </span>
        {entry.text && (
          <span
            style={{
              // A box clamped to three lines: a long note should not push the next
              // entry off the screen.
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginTop: 3,
              fontFamily: entry.kind === 'saved' ? 'var(--font-display)' : 'var(--font-ui)',
              fontSize: entry.kind === 'saved' ? 15 : 13.5,
              lineHeight: 1.5,
              color: 'var(--text-primary)',
            }}
          >
            {entry.text}
          </span>
        )}
      </span>
    </button>
  );
}

function Chip({
  on,
  disabled,
  onClick,
  children,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={spring.snappy}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 11px',
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 600,
        background: on ? 'var(--main-fill)' : 'var(--bg-sunken)',
        color: on ? 'var(--main-on)' : 'var(--text-secondary)',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </motion.button>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
      <strong style={{ display: 'block', fontSize: 15, color: 'var(--text-primary)' }}>
        {title}
      </strong>
      <p
        style={{
          marginTop: 7,
          fontSize: 13,
          lineHeight: 1.6,
          maxWidth: '44ch',
          margin: '7px auto 0',
        }}
      >
        {body}
      </p>
    </div>
  );
}
