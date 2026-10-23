import { AnimatePresence, motion } from 'framer-motion';
import type { Book } from '../lib/bible';
import { referenceOf, useSaved } from '../lib/saved';
import { useNotes } from '../lib/notes';
import { spring, transition } from '../lib/motion';
import { BookmarkIcon, CloseIcon, NoteIcon } from './Icons';

export type PanelTab = 'notes' | 'saved';

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
  chapter,
  onOpenVerse,
}: {
  open: boolean;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  onClose: () => void;
  book: Book;
  chapter: number;
  onOpenVerse: (bookId: number, chapter: number) => void;
}) {
  const notes = useNotes(book.id, chapter);
  const { saved, remove } = useSaved();

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 392, opacity: 1 }}
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
              width: 392,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              padding: '16px 20px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                role="tablist"
                style={{
                  display: 'flex',
                  gap: 2,
                  padding: 3,
                  borderRadius: 10,
                  background: 'var(--bg-sunken)',
                }}
              >
                {(
                  [
                    ['notes', 'Notes', NoteIcon],
                    ['saved', 'Saved', BookmarkIcon],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => onTab(id)}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 7,
                      fontWeight: 600,
                      fontSize: 13,
                      color: tab === id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {tab === id && (
                      <motion.span
                        layoutId="panel-tab"
                        transition={spring.snappy}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 7,
                          background: 'var(--bg-card)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.07)',
                        }}
                      />
                    )}
                    <span style={{ position: 'relative', display: 'flex', gap: 6 }}>
                      <Icon size={15} />
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

            {tab === 'notes' ? (
              <>
                <div
                  style={{
                    marginTop: 16,
                    font: '600 11px var(--font-ui)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {book.name} {chapter}
                </div>
                <textarea
                  value={notes.text}
                  onChange={(event) => notes.write(event.target.value)}
                  placeholder="What do you see here, and what is it asking of you?"
                  style={{
                    flex: 1,
                    marginTop: 10,
                    padding: 16,
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--line-default)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-display)',
                    fontSize: 16,
                    lineHeight: 1.65,
                    resize: 'none',
                  }}
                />
                <div style={{ color: 'var(--text-faint)', fontSize: 12, marginTop: 10 }}>
                  Saved as you type · {notes.written()} chapters with notes
                </div>
              </>
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
      )}
    </AnimatePresence>
  );
}
