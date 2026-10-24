import { useEffect, useRef, useState } from 'react';
import { SlidingHighlight } from './SlidingHighlight';
import { AnimatePresence, motion } from 'framer-motion';
import type { Book } from '../lib/bible';
import { referenceOf, useSaved } from '../lib/saved';
import { transition } from '../lib/motion';
import { BookmarkIcon, CloseIcon, LinkIcon, NotebookIcon, StickyIcon } from './Icons';
import { CrossRefs } from './CrossRefs';
import { StickyBoard } from './StickyBoard';
import { NotebookEditor } from './NotebookEditor';

export type PanelTab = 'notes' | 'notebook' | 'saved' | 'refs';

/**
 * The panel beside the text: what you have written, and what you have kept.
 *
 * It slides rather than appears, and holds its width while it does, so the text beside
 * it reflows once instead of twitching for the length of the animation.
 */
export function SidePanel({
  open,
  tab,
  onTab,
  onClose,
  book,
  books,
  chapter,
  verse,
  onOpenVerse,
}: {
  open: boolean;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  onClose: () => void;
  book: Book;
  books: Book[];
  chapter: number;
  /** The verse selected in the reader, which the references follow. */
  verse: number | null;
  onOpenVerse: (bookId: number, chapter: number, verse?: number) => void;
}) {
  const { saved, remove } = useSaved();
  const tabList = useRef<HTMLDivElement>(null);
  const beside = useRoomToSit();

  // Below this width the panel would leave the text narrower than itself, so it
  // slides over the page instead of pushing it aside.
  const width = beside ? 392 : Math.min(392, window.innerWidth - 48);

  return (
    <AnimatePresence>
      {open && (
        <>
          {!beside && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              onClick={onClose}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 29,
                background: 'rgba(23, 20, 15, 0.3)',
              }}
              aria-hidden="true"
            />
          )}
          <motion.aside
            initial={beside ? { width: 0, opacity: 0 } : { x: width, opacity: 0 }}
            animate={beside ? { width, opacity: 1 } : { x: 0, opacity: 1 }}
            exit={beside ? { width: 0, opacity: 0 } : { x: width, opacity: 0 }}
            transition={transition('smooth')}
            style={{
              flex: 'none',
              overflow: 'hidden',
              borderLeft: '1px solid var(--line-default)',
              background: 'var(--bg-shell)',
              ...(beside
                ? {}
                : {
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width,
                    zIndex: 30,
                    boxShadow: 'var(--shadow-shell)',
                  }),
            }}
          >
            <div
              style={{
                width,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: '16px 20px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  ref={tabList}
                  role="tablist"
                  style={{
                    position: 'relative',
                    display: 'flex',
                    gap: 2,
                    padding: 2,
                    borderRadius: 9,
                    background: 'var(--bg-sunken)',
                    border: '1px solid var(--line-default)',
                  }}
                >
                  <SlidingHighlight
                    container={tabList}
                    activeKey={tab}
                    style={{
                      borderRadius: 7,
                      background: 'var(--bg-selected)',
                      boxShadow: 'inset 0 1px 0 var(--glass-highlight), 0 1px 2px rgba(0,0,0,0.25)',
                    }}
                  />
                  {(
                    [
                      ['notes', 'Sticky', StickyIcon],
                      ['notebook', 'Notebook', NotebookIcon],
                      ['refs', 'Links', LinkIcon],
                      ['saved', 'Saved', BookmarkIcon],
                    ] as const
                  ).map(([id, label, Icon]) => (
                    <button
                      key={id}
                      role="tab"
                      data-active={tab === id}
                      aria-selected={tab === id}
                      onClick={() => onTab(id)}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        height: 26,
                        padding: '0 8px',
                        borderRadius: 7,
                        fontWeight: 600,
                        fontSize: 12,
                        color: tab === id ? 'var(--text-primary)' : 'var(--text-faint)',
                      }}
                    >
                      <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Icon size={14} />
                        {label}
                        {id === 'saved' && saved.length > 0 && (
                          <span className="tabular" style={{ color: 'var(--text-faint)' }}>
                            {saved.length}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={onClose}
                  aria-label="Close the panel"
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

              {tab === 'refs' ? (
                <CrossRefs
                  book={book}
                  books={books}
                  chapter={chapter}
                  verse={verse}
                  onOpenVerse={onOpenVerse}
                />
              ) : tab === 'notes' ? (
                <StickyBoard
                  book={book}
                  chapter={chapter}
                  verse={verse}
                  onOpenVerse={(chapterNumber, verseNumber) =>
                    onOpenVerse(book.id, chapterNumber, verseNumber)
                  }
                />
              ) : tab === 'notebook' ? (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 14 }}>
                  <NotebookEditor
                    compact
                    passage={`${book.name} ${chapter}${verse ? `:${verse}` : ''}`}
                  />
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', marginTop: 14 }}>
                  {saved.length === 0 ? (
                    <div
                      style={{
                        marginTop: 28,
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        padding: '0 20px',
                      }}
                    >
                      <BookmarkIcon size={28} />
                      <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
                        Nothing saved yet. Select a verse and choose Save to keep it here.
                      </p>
                    </div>
                  ) : (
                    saved.map((entry) => (
                      <motion.div
                        key={`${entry.bookId}:${entry.chapter}:${entry.verse}`}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={transition('smooth')}
                        style={{
                          padding: 14,
                          marginBottom: 10,
                          borderRadius: 'var(--radius-card)',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--line-default)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={() => onOpenVerse(entry.bookId, entry.chapter)}
                            style={{
                              font: '600 12px var(--font-ui)',
                              color: 'var(--text-tan)',
                            }}
                          >
                            {referenceOf(entry)}
                          </button>
                          <button
                            onClick={() => remove(entry.bookId, entry.chapter, entry.verse)}
                            aria-label={`Remove ${referenceOf(entry)}`}
                            style={{
                              marginLeft: 'auto',
                              color: 'var(--text-faint)',
                              display: 'grid',
                              placeItems: 'center',
                            }}
                          >
                            <CloseIcon size={14} />
                          </button>
                        </div>
                        <p
                          style={{
                            marginTop: 6,
                            fontFamily: 'var(--font-display)',
                            fontSize: 15,
                            lineHeight: 1.55,
                          }}
                        >
                          {entry.text}
                        </p>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Whether the window has room for the panel beside the text.
 *
 * Below this the panel would be wider than what it leaves of the page, so it covers
 * the page instead. The threshold is the panel plus a readable column, not a round
 * number picked for looking tidy.
 */
function useRoomToSit(): boolean {
  const [roomy, setRoomy] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 1040,
  );

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1040px)');
    const update = () => setRoomy(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return roomy;
}
