import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Book } from '../lib/bible';
import { sheetVariants, transition } from '../lib/motion';

/**
 * Choosing where to read. Opens on the book list, filters as you type, and once a book
 * is chosen shows its chapters as a grid rather than a long list to scroll.
 */
export function BookPicker({
  books,
  current,
  onChoose,
  onClose,
}: {
  books: Book[];
  current: Book;
  onChoose: (book: Book, chapter: number) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<Book | null>(current);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return books;
    return books.filter(
      (book) =>
        book.name.toLowerCase().includes(needle) ||
        book.abbreviation.toLowerCase().startsWith(needle),
    );
  }, [books, query]);

  // Typing a new filter means the old selection is no longer what is being looked at.
  useEffect(() => {
    if (query.trim() && matches.length > 0) setChosen(matches[0]);
  }, [query, matches]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(23, 20, 15, 0.45)',
        backdropFilter: 'blur(2px)',
        display: 'grid',
        alignItems: 'start',
        justifyItems: 'center',
        paddingTop: '10vh',
        zIndex: 40,
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
        aria-label="Choose a book and chapter"
        style={{
          width: 'min(720px, calc(100vw - 32px))',
          maxHeight: '72vh',
          display: 'grid',
          gridTemplateRows: 'auto minmax(0, 1fr)',
          background: 'var(--bg-card)',
          border: '1px solid var(--line-default)',
          borderRadius: 'var(--radius-panel)',
          boxShadow: 'var(--shadow-shell)',
          overflow: 'hidden',
        }}
      >
        <input
          ref={input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a book…"
          aria-label="Find a book"
          style={{
            padding: '16px 20px',
            border: 0,
            borderBottom: '1px solid var(--line-default)',
            background: 'transparent',
            fontSize: 16,
            outline: 'none',
          }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', minHeight: 0 }}>
          <div
            style={{ overflowY: 'auto', borderRight: '1px solid var(--line-default)', padding: 8 }}
          >
            {matches.length === 0 && (
              <p style={{ padding: 12, color: 'var(--text-secondary)' }}>No book by that name.</p>
            )}
            {matches.map((book) => (
              <button
                key={book.id}
                onClick={() => setChosen(book)}
                aria-current={chosen?.id === book.id}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontWeight: chosen?.id === book.id ? 600 : 400,
                  background: chosen?.id === book.id ? 'var(--bg-selected)' : 'transparent',
                }}
              >
                {book.name}
              </button>
            ))}
          </div>

          <div style={{ overflowY: 'auto', padding: 16 }}>
            {chosen && (
              <>
                <div
                  style={{
                    font: '600 11px var(--font-ui)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    marginBottom: 12,
                  }}
                >
                  {chosen.name} · {chosen.chapters} chapters
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
                    gap: 6,
                  }}
                >
                  {Array.from({ length: chosen.chapters }, (_, index) => index + 1).map(
                    (number) => (
                      <button
                        key={number}
                        onClick={() => onChoose(chosen, number)}
                        className="tabular"
                        style={{
                          height: 40,
                          borderRadius: 8,
                          background: 'var(--bg-sunken)',
                          fontWeight: 500,
                        }}
                      >
                        {number}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Wraps the picker so it animates out as well as in. */
export function BookPickerHost({
  open,
  ...props
}: { open: boolean } & Parameters<typeof BookPicker>[0]) {
  return <AnimatePresence>{open && <BookPicker {...props} />}</AnimatePresence>;
}
