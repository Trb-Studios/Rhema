import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  books as loadBooks,
  chapter as loadChapter,
  nextChapter,
  previousChapter,
} from '../lib/bible';
import type { Book, Verse } from '../lib/bible';
import { HIGHLIGHT_OPACITY, QUICK_PICKS } from '../lib/highlights';
import { useSettings } from '../lib/settings';
import { pageVariants, spring, transition } from '../lib/motion';
import { BookPickerHost } from '../components/BookPicker';
import { StudyPanel } from '../components/StudyPanel';

/**
 * Which verses are highlighted, and in which colour.
 *
 * Keyed by book, chapter, and verse together. Keying on the verse number alone would
 * put a mark on Genesis 1:3 and John 3:3 at once.
 */
type Highlights = Record<string, number>;

function verseKey(book: Book, chapter: number, verse: number) {
  return `${book.id}:${chapter}:${verse}`;
}

export function Reader() {
  const { settings } = useSettings();

  const [all, setAll] = useState<Book[]>([]);
  const [book, setBook] = useState<Book | null>(null);
  const [number, setNumber] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<Highlights>({});
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBooks()
      .then((list) => {
        setAll(list);
        setBook(list[0] ?? null);
      })
      .catch((cause: Error) => setError(cause.message));
  }, []);

  useEffect(() => {
    if (!book) return;
    setSelected(null);
    loadChapter(book, number)
      .then(setVerses)
      .catch((cause: Error) => setError(cause.message));
  }, [book, number]);

  const goTo = useCallback((destination: { book: Book; chapter: number } | null) => {
    if (!destination) return;
    setBook(destination.book);
    setNumber(destination.chapter);
  }, []);

  // Left and right arrows move between chapters, the way a book turns.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!book || picking) return;
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === 'ArrowLeft') goTo(previousChapter(all, book, number));
      if (event.key === 'ArrowRight') goTo(nextChapter(all, book, number));
      if (event.key === 'Escape') setSelected(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [all, book, number, picking, goTo]);

  if (error) {
    return (
      <div style={{ padding: '56px 40px', maxWidth: '60ch' }}>
        <h1 style={{ fontSize: 28 }}>The text is not loaded yet</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 10 }}>{error}</p>
      </div>
    );
  }

  if (!book) {
    return <div style={{ padding: '56px 40px', color: 'var(--text-secondary)' }}>Opening…</div>;
  }

  const previous = previousChapter(all, book, number);
  const next = nextChapter(all, book, number);

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 380px',
          gap: 24,
          alignItems: 'start',
          padding: '28px 32px 64px',
          maxWidth: 1240,
          margin: '0 auto',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <article
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--line-default)',
              borderRadius: 'var(--radius-card)',
              padding: '34px 4% 30px',
            }}
          >
            <div style={{ maxWidth: 'var(--reading-width)', margin: '0 auto' }}>
              <motion.button
                onClick={() => setPicking(true)}
                whileTap={{ scale: 0.97 }}
                transition={spring.snappy}
                aria-label={`Reading ${book.name}. Choose another book or chapter.`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginLeft: -10,
                  padding: '4px 10px',
                  borderRadius: 999,
                  font: '600 11px var(--font-ui)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-sunken)',
                }}
              >
                {book.name}
                <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" fill="none">
                  <path
                    d="M7 10l5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.button>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${book.id}:${number}`}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition('smooth')}
                >
                  <h1 style={{ fontSize: 36, marginTop: 4 }}>Chapter {number}</h1>
                  <div
                    style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 22px' }}
                  >
                    King James Version
                  </div>

                  <div
                    className="reading selectable"
                    style={{ display: settings.versePerLine ? 'grid' : 'block', gap: 6 }}
                  >
                    {verses.map((verse) => {
                      const colour = highlights[verseKey(book, number, verse.number)];
                      const isSelected = selected === verse.number;
                      return (
                        <span
                          key={verse.number}
                          style={{
                            display: settings.versePerLine ? 'block' : 'inline',
                            borderRadius: 3,
                            boxDecorationBreak: 'clone',
                            WebkitBoxDecorationBreak: 'clone',
                            background:
                              colour === undefined
                                ? undefined
                                : `color-mix(in srgb, ${QUICK_PICKS.find((p) => p.index === colour)?.colour ?? 'transparent'} ${HIGHLIGHT_OPACITY * 100}%, transparent)`,
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
                                font: '600 0.62em var(--font-ui)',
                                verticalAlign: 'super',
                                color: 'var(--text-secondary)',
                                marginRight: '0.25em',
                              }}
                            >
                              {verse.number}
                            </button>
                          )}
                          {verse.text}{' '}
                        </span>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>

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
                      bottom: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      flexWrap: 'wrap',
                      marginTop: 18,
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
                              [verseKey(book, number, selected)]: pick.index,
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
                          const next = { ...current };
                          delete next[verseKey(book, number, selected)];
                          return next;
                        })
                      }
                      style={{ fontWeight: 600, color: 'var(--text-secondary)' }}
                    >
                      Remove
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginTop: 28,
                  paddingTop: 18,
                  borderTop: '1px solid var(--line-default)',
                }}
              >
                <ChapterButton
                  label={previous ? `${previous.book.name} ${previous.chapter}` : 'The beginning'}
                  disabled={!previous}
                  onClick={() => goTo(previous)}
                />
                <ChapterButton
                  label={next ? `${next.book.name} ${next.chapter}` : 'The end'}
                  disabled={!next}
                  onClick={() => goTo(next)}
                />
              </div>
            </div>
          </article>
        </div>

        <StudyPanel book={book.name} chapter={number} />
      </div>

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
    </>
  );
}

function ChapterButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={spring.snappy}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 16px',
        borderRadius: 'var(--radius-control)',
        border: '1px solid var(--line-default)',
        fontWeight: 600,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {label}
    </motion.button>
  );
}
