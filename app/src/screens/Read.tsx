import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  books as loadBooks,
  chapter as loadChapter,
  nextChapter,
  previousChapter,
} from '../lib/bible';
import type { Book, Verse } from '../lib/bible';
import { markUp } from '../lib/marks';
import { useNotes } from '../lib/notes';
import { useProgress } from '../lib/progress';
import { useSettings } from '../lib/settings';
import { HIGHLIGHT_OPACITY, QUICK_PICKS } from '../lib/highlights';
import { pageVariants, spring, transition } from '../lib/motion';
import { BookPickerHost } from '../components/BookPicker';
import { MarkPopover } from '../components/MarkPopover';
import type { Anchored } from '../components/MarkPopover';
import { Menu } from '../components/Menu';

type Highlights = Record<string, number>;

function verseKey(bookId: number, chapter: number, verse: number) {
  return `${bookId}:${chapter}:${verse}`;
}

function loadHighlights(): Highlights {
  try {
    return JSON.parse(localStorage.getItem('rhema.highlights') ?? '{}') as Highlights;
  } catch {
    return {};
  }
}

/**
 * The whole app: Scripture on the left, a notepad on the right, and nothing else in the
 * way. Names and places are marked in the text itself and open a small card where they
 * stand, rather than in a panel of tabs off to one side.
 */
export function Read() {
  const { settings } = useSettings();
  const { progress, visit, toggleRead, isRead } = useProgress();

  const [all, setAll] = useState<Book[]>([]);
  const [book, setBook] = useState<Book | null>(null);
  const [number, setNumber] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<Highlights>(loadHighlights);
  const [anchored, setAnchored] = useState<Anchored | null>(null);
  const [picking, setPicking] = useState(false);
  const [notesOpen, setNotesOpen] = useState(true);
  const [error, setError] = useState('');

  const notes = useNotes(book?.id ?? 0, number);

  useEffect(() => {
    loadBooks()
      .then((list) => {
        setAll(list);
        const resume = progress.last;
        const opening = resume ? list.find((b) => b.id === resume.bookId) : undefined;
        setBook(opening ?? list[0] ?? null);
        if (opening && resume) setNumber(resume.chapter);
      })
      .catch((cause: Error) => setError(cause.message));
    // The saved position decides where to open, and is not followed afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!book) return;
    setSelected(null);
    setAnchored(null);
    loadChapter(book, number)
      .then(setVerses)
      .catch((cause: Error) => setError(cause.message));
    visit(book.id, number);
  }, [book, number, visit]);

  useEffect(() => {
    try {
      localStorage.setItem('rhema.highlights', JSON.stringify(highlights));
    } catch {
      // Losing a highlight is not worth interrupting a reading session over.
    }
  }, [highlights]);

  const goTo = useCallback((to: { book: Book; chapter: number } | null) => {
    if (!to) return;
    setBook(to.book);
    setNumber(to.chapter);
  }, []);

  const previous = useMemo(
    () => (book ? previousChapter(all, book, number) : null),
    [all, book, number],
  );
  const next = useMemo(() => (book ? nextChapter(all, book, number) : null), [all, book, number]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (picking || event.target instanceof HTMLTextAreaElement) return;
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === 'ArrowLeft') goTo(previous);
      if (event.key === 'ArrowRight') goTo(next);
      if (event.key === 'Escape') setSelected(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previous, next, picking, goTo]);

  if (error) {
    return (
      <div style={{ padding: '56px 32px', maxWidth: '60ch' }}>
        <h1 style={{ fontSize: 26 }}>The text is not loaded</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 10 }}>{error}</p>
      </div>
    );
  }

  if (!book) return <div style={{ padding: 56, color: 'var(--text-secondary)' }}>Opening…</div>;

  const read = isRead(book.id, number);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 16px',
          height: 52,
          flex: 'none',
          borderBottom: '1px solid var(--line-default)',
          background: 'var(--bg-shell)',
        }}
      >
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'var(--main-fill)',
            color: 'var(--main-on)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            flex: 'none',
          }}
          aria-hidden="true"
        >
          R
        </span>

        <Arrow label="Previous chapter" disabled={!previous} onClick={() => goTo(previous)} back />

        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={spring.snappy}
          onClick={() => setPicking(true)}
          aria-label={`Reading ${book.name} ${number}. Choose another book or chapter.`}
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            background: 'var(--bg-sunken)',
            fontWeight: 600,
            minWidth: 150,
          }}
        >
          {book.name} {number}
        </motion.button>

        <Arrow label="Next chapter" disabled={!next} onClick={() => goTo(next)} />

        <span style={{ flex: 1 }} />

        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={spring.snappy}
          onClick={() => toggleRead(book.id, number)}
          aria-pressed={read}
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            fontWeight: 600,
            fontSize: 13,
            background: read ? 'var(--main-fill)' : 'transparent',
            color: read ? 'var(--main-on)' : 'var(--text-secondary)',
            border: `1px solid ${read ? 'var(--main-fill)' : 'var(--line-default)'}`,
          }}
        >
          {read ? 'Read' : 'Mark read'}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={spring.snappy}
          onClick={() => setNotesOpen((open) => !open)}
          aria-pressed={notesOpen}
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            fontWeight: 600,
            fontSize: 13,
            background: notesOpen ? 'var(--bg-selected)' : 'transparent',
            border: '1px solid var(--line-default)',
          }}
        >
          Notes
        </motion.button>

        <Menu books={all} progress={progress} />
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          <AnimatePresence mode="wait">
            <motion.article
              key={`${book.id}:${number}`}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition('smooth')}
              style={{ padding: '40px 32px 72px' }}
            >
              <div style={{ maxWidth: 'var(--reading-width)', margin: '0 auto' }}>
                <h1 style={{ fontSize: 32 }}>
                  {book.name} {number}
                </h1>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 26px' }}>
                  King James Version
                </div>

                <div className="reading selectable">
                  {verses.map((verse) => {
                    const colour = highlights[verseKey(book.id, number, verse.number)];
                    const chosen = QUICK_PICKS.find((pick) => pick.index === colour);
                    const isSelected = selected === verse.number;

                    return (
                      <span key={verse.number}>
                        {verse.heading && (
                          <span
                            style={{
                              display: 'block',
                              marginTop: verse.number === 1 ? 0 : '1.2em',
                              marginBottom: '0.35em',
                              font: '600 11px var(--font-ui)',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {verse.heading}
                          </span>
                        )}
                        <span
                          style={{
                            borderRadius: 3,
                            boxDecorationBreak: 'clone',
                            WebkitBoxDecorationBreak: 'clone',
                            background: chosen
                              ? `color-mix(in srgb, ${chosen.colour} ${HIGHLIGHT_OPACITY * 100}%, transparent)`
                              : undefined,
                            outline: isSelected ? '2px solid var(--focus-ring)' : undefined,
                            outlineOffset: 1,
                          }}
                        >
                          {settings.verseNumbers && (
                            <button
                              onClick={() => setSelected(isSelected ? null : verse.number)}
                              aria-label={`Select verse ${verse.number}`}
                              className="tabular"
                              style={{
                                font: '600 0.6em var(--font-ui)',
                                verticalAlign: 'super',
                                color: 'var(--text-faint)',
                                marginRight: '0.3em',
                              }}
                            >
                              {verse.number}
                            </button>
                          )}
                          {markUp(verse.text).map((piece, index) =>
                            piece.type === 'text' ? (
                              <span key={index}>{piece.text}</span>
                            ) : (
                              <button
                                key={index}
                                onClick={(event) => {
                                  const box = event.currentTarget.getBoundingClientRect();
                                  setAnchored({
                                    subject: piece.subject,
                                    at: { book: book.name, chapter: number },
                                    x: box.left + box.width / 2,
                                    y: box.bottom,
                                  });
                                }}
                                style={{
                                  font: 'inherit',
                                  color:
                                    piece.subject.kind === 'person'
                                      ? 'var(--mark-name)'
                                      : 'var(--mark-place)',
                                  borderBottom: `1.5px solid color-mix(in srgb, currentColor 45%, transparent)`,
                                  borderRadius: 2,
                                }}
                              >
                                {piece.text}
                              </button>
                            ),
                          )}{' '}
                        </span>
                      </span>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {selected !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={transition('snappy')}
                      role="toolbar"
                      aria-label="Verse tools"
                      style={{
                        position: 'sticky',
                        bottom: 16,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                        marginTop: 20,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-card)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--line-default)',
                        boxShadow: 'var(--shadow-raised)',
                      }}
                    >
                      <strong className="tabular">Verse {selected}</strong>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {QUICK_PICKS.map((pick) => (
                          <motion.button
                            key={pick.index}
                            whileHover={{ scale: 1.18 }}
                            transition={spring.snappy}
                            onClick={() =>
                              setHighlights((current) => ({
                                ...current,
                                [verseKey(book.id, number, selected)]: pick.index,
                              }))
                            }
                            aria-label={`Highlight ${pick.name}`}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: pick.colour,
                              border: '2px solid var(--bg-card)',
                              boxShadow: '0 0 0 1px var(--line-default)',
                            }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() =>
                          setHighlights((current) => {
                            const copy = { ...current };
                            delete copy[verseKey(book.id, number, selected)];
                            return copy;
                          })
                        }
                        style={{ fontWeight: 600, color: 'var(--text-secondary)' }}
                      >
                        Remove
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {notesOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={transition('smooth')}
              style={{
                flex: 'none',
                overflow: 'hidden',
                borderLeft: '1px solid var(--line-default)',
                background: 'var(--bg-shell)',
              }}
            >
              <div
                style={{
                  width: 380,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 20,
                }}
              >
                <div
                  style={{
                    font: '600 11px var(--font-ui)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Notes on {book.name} {number}
                </div>
                <textarea
                  value={notes.text}
                  onChange={(event) => notes.write(event.target.value)}
                  placeholder={`What do you see here, and what is it asking of you?`}
                  style={{
                    flex: 1,
                    marginTop: 12,
                    padding: 14,
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--line-default)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-display)',
                    fontSize: 16,
                    lineHeight: 1.6,
                    resize: 'none',
                  }}
                />
                <div style={{ color: 'var(--text-faint)', fontSize: 12, marginTop: 10 }}>
                  Saved as you type · {notes.written()} chapters with notes
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <MarkPopover anchored={anchored} onClose={() => setAnchored(null)} />

      <BookPickerHost
        open={picking}
        books={all}
        current={book}
        onChoose={(chosenBook, chosenChapter) => {
          setBook(chosenBook);
          setNumber(chosenChapter);
          setPicking(false);
        }}
        onClose={() => setPicking(false)}
      />
    </div>
  );
}

function Arrow({
  label,
  disabled,
  onClick,
  back,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  back?: boolean;
}) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.92 }}
      transition={spring.snappy}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        display: 'grid',
        placeItems: 'center',
        color: 'var(--text-secondary)',
        opacity: disabled ? 0.3 : 1,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d={back ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.button>
  );
}
