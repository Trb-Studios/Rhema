import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Book } from '../lib/bible';
import { books as loadBooks } from '../lib/bible';
import { migrateChapterNotes, outlineOf, useNotebook } from '../lib/notebook';
import { STICKY_TONES, useAllStickies } from '../lib/stickies';
import { navigate, useRecentBooks } from '../lib/nav';
import { useProgress } from '../lib/progress';
import { transition } from '../lib/motion';
import { ScreenHeader } from '../components/ScreenHeader';
import { NotebookEditor } from '../components/NotebookEditor';
import type { NotebookHandle } from '../components/NotebookEditor';
import { NotebookIcon, StickyIcon } from '../components/Icons';

/**
 * The notebook at full width, with its outline on the left and every book's sticky
 * notes on the right: everything you have written, in one place.
 */
export function Notebook() {
  const [books, setBooks] = useState<Book[]>([]);
  const { text } = useNotebook();
  const stickies = useAllStickies();
  const { progress } = useProgress();
  const recent = useRecentBooks();
  const editor = useRef<NotebookHandle>(null);

  useEffect(() => {
    void loadBooks()
      .then((list) => {
        setBooks(list);
        migrateChapterNotes(list);
      })
      .catch(() => {});
  }, []);

  const outline = useMemo(() => outlineOf(text), [text]);
  const lastBook = books.find((book) => book.id === (progress.last?.bookId ?? recent[0]));
  const passage =
    lastBook && progress.last ? `${lastBook.name} ${progress.last.chapter}` : undefined;

  const stickyBooks = Object.entries(stickies)
    .map(([bookId, list]) => ({ book: books.find((book) => book.id === Number(bookId)), list }))
    .filter(
      (entry): entry is { book: Book; list: typeof entry.list } =>
        Boolean(entry.book) && entry.list.length > 0,
    )
    .sort((a, b) => a.book.id - b.book.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <ScreenHeader icon={<NotebookIcon size={15} />} crumbs={['Notebook']} />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(170px, 220px) minmax(0, 1fr) minmax(220px, 280px)',
          gap: 0,
        }}
      >
        {/* Outline */}
        <aside
          style={{
            borderRight: '1px solid var(--line-faint)',
            padding: '22px 14px',
            overflowY: 'auto',
          }}
        >
          <div className="eyebrow" style={{ padding: '0 8px 8px' }}>
            Outline
          </div>
          {outline.length === 0 ? (
            <p
              style={{
                padding: '0 8px',
                fontSize: 12.5,
                lineHeight: 1.6,
                color: 'var(--text-faint)',
              }}
            >
              Headings you write appear here. Start a line with ## to make one.
            </p>
          ) : (
            outline.map((entry, index) => (
              <motion.button
                key={`${entry.at}-${entry.title}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...transition('smooth'), delay: Math.min(index * 0.02, 0.3) }}
                onClick={() => editor.current?.jumpTo(entry.at)}
                className="row-hover"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'start',
                  padding: `6px 8px 6px ${8 + (entry.level - 1) * 10}px`,
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: entry.level === 1 ? 600 : 500,
                  color: entry.level === 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {entry.title}
              </motion.button>
            ))
          )}
        </aside>

        {/* The page */}
        <section
          style={{
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '26px clamp(16px, 4vw, 48px) 24px',
          }}
        >
          <div
            style={{
              maxWidth: 780,
              width: '100%',
              margin: '0 auto',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h1 style={{ fontSize: 34, marginBottom: 4 }}>Notebook</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 18 }}>
              One notebook for the whole Bible. It is the same one beside the text in the reader.
            </p>
            <NotebookEditor ref={editor} passage={passage} />
          </div>
        </section>

        {/* Every book's sticky notes */}
        <aside
          style={{
            borderLeft: '1px solid var(--line-faint)',
            padding: '22px 16px',
            overflowY: 'auto',
          }}
        >
          <div
            className="eyebrow"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px 10px' }}
          >
            <StickyIcon size={13} />
            Sticky notes
          </div>
          {stickyBooks.length === 0 ? (
            <p
              style={{
                padding: '0 4px',
                fontSize: 12.5,
                lineHeight: 1.6,
                color: 'var(--text-faint)',
              }}
            >
              Sticky notes you leave in any book are gathered here.
            </p>
          ) : (
            stickyBooks.map(({ book, list }) => (
              <div key={book.id} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, padding: '0 4px 6px' }}>
                  {book.name}{' '}
                  <span className="tabular" style={{ color: 'var(--text-faint)', fontWeight: 500 }}>
                    {list.length}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {list.map((sticky) => (
                    <motion.button
                      key={sticky.id}
                      whileHover={{ x: 2 }}
                      onClick={() =>
                        navigate({
                          screen: 'read',
                          bookId: book.id,
                          chapter: sticky.anchor?.chapter ?? 1,
                          verse: sticky.anchor?.verse,
                        })
                      }
                      style={{
                        display: 'flex',
                        gap: 8,
                        textAlign: 'start',
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--line-default)',
                      }}
                    >
                      <span
                        style={{
                          width: 4,
                          flex: 'none',
                          alignSelf: 'stretch',
                          borderRadius: 4,
                          background: STICKY_TONES[sticky.colour].fill,
                        }}
                      />
                      <span style={{ minWidth: 0 }}>
                        <span
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontSize: 12.5,
                            lineHeight: 1.45,
                            color: sticky.text ? 'var(--text-primary)' : 'var(--text-faint)',
                          }}
                        >
                          {sticky.text ||
                            (sticky.anchor?.quote ? `“${sticky.anchor.quote}”` : 'Empty note')}
                        </span>
                        {sticky.anchor && (
                          <span
                            className="tabular"
                            style={{ fontSize: 11, color: 'var(--text-faint)' }}
                          >
                            {book.name} {sticky.anchor.chapter}
                            {sticky.anchor.verse ? `:${sticky.anchor.verse}` : ''}
                          </span>
                        )}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            ))
          )}
        </aside>
      </div>
    </div>
  );
}
