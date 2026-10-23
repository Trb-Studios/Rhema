import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { spring, transition } from '../lib/motion';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'people', label: 'People' },
  { id: 'places', label: 'Places' },
  { id: 'words', label: 'Words' },
  { id: 'notes', label: 'Notes' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/**
 * The panel beside the text. Each tab fills in as its data source lands: people and
 * places once Theographic is imported, words once Strong's is, the overview once the
 * AI function exists. Until then each says plainly what will appear there, rather than
 * showing invented content that would read as real.
 */
export function StudyPanel({ book, chapter }: { book: string; chapter: number }) {
  const [tab, setTab] = useState<TabId>('overview');

  return (
    <aside
      aria-label="Study panel"
      style={{
        position: 'sticky',
        top: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: 2,
          padding: 4,
          borderRadius: 10,
          background: 'var(--bg-sunken)',
        }}
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            style={{
              position: 'relative',
              flex: 1,
              padding: '7px 8px',
              fontWeight: 600,
              fontSize: 13,
              color: tab === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {tab === item.id && (
              <motion.span
                layoutId="study-tab"
                transition={spring.snappy}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 7,
                  background: 'var(--bg-card)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                }}
              />
            )}
            <span style={{ position: 'relative' }}>{item.label}</span>
          </button>
        ))}
      </div>

      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--line-default)',
          borderRadius: 'var(--radius-card)',
          padding: 20,
          minHeight: 180,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={transition('smooth')}
          >
            <h2 style={{ fontSize: 20 }}>
              {book} {chapter}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 13 }}>
              {WAITING_ON[tab]}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </aside>
  );
}

const WAITING_ON: Record<TabId, string> = {
  overview:
    'A short AI overview of this chapter will sit here: what happens, who and where, the main themes, and how it connects to the rest of Scripture. It cites verses so it can be checked. Waiting on the AI function.',
  people:
    'Everyone named in this chapter, each opening their card and family tree. Waiting on the Theographic import.',
  places:
    'Every place named here, with its old and new names and a pin on the map. Waiting on the OpenBible geocoding import.',
  words:
    'The key Hebrew and Greek behind this chapter, each one searchable across all 66 books. Waiting on the Strong’s import.',
  notes: 'Your notes on this chapter, with the prompt asking what it is calling you to do.',
};
