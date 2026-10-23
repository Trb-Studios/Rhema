import { motion } from 'framer-motion';
import { Icon } from '../components/Icon';
import { transition } from '../lib/motion';
import { SCREENS } from '../lib/screens';
import type { ScreenId } from '../lib/screens';

/**
 * A screen that is planned but not built.
 *
 * It says what will be here and what it is waiting on, rather than showing a convincing
 * shell full of invented content. Nothing on this page should ever be mistaken for the
 * finished thing.
 */
const WAITING_ON: Partial<Record<ScreenId, string>> = {
  people:
    'A card for everyone named in Scripture: meaning, role, family, and every verse they appear in, with a tree running from Adam to Jesus. Waiting on the Theographic import.',
  places:
    'A card and a map pin for every place, with its old and new names, and journeys such as Abraham’s or Paul’s drawn on the map. Waiting on the OpenBible geocoding import.',
  words:
    'Look up any word in Hebrew or Koine Greek and find every verse that uses it, across all 66 books. Waiting on the Strong’s and Open Scriptures imports.',
  notes:
    'Notes on a verse, a chapter, or a book, each asking what the passage is calling you to do, and every highlight searchable by colour.',
  quiz: 'Pick any book and Claude writes cards from its text. Waiting on the AI function.',
  review:
    'Everything due in one short session: quiz cards, saved words, and notes you flagged. Waiting on the Quiz tab.',
  settings:
    'Theme and accent, reading size and spacing, the names of all 30 highlight colours, keyboard shortcuts, reminders, and backup. Some of this already works from the reader.',
};

export function Coming({ screen }: { screen: ScreenId }) {
  const meta = SCREENS.find((candidate) => candidate.id === screen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition('smooth')}
      style={{ padding: '56px 32px', maxWidth: 640, margin: '0 auto' }}
    >
      <span style={{ color: 'var(--text-tan)' }}>
        <Icon name={meta?.icon ?? 'book'} size={28} />
      </span>
      <h1 style={{ fontSize: 30, marginTop: 12 }}>{meta?.label}</h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: 10, lineHeight: 1.6 }}>
        {WAITING_ON[screen] ?? 'Not built yet.'}
      </p>
      <p style={{ color: 'var(--text-faint)', marginTop: 18, fontSize: 13 }}>
        Not built yet. The build order is in docs/roadmap.md.
      </p>
    </motion.div>
  );
}
