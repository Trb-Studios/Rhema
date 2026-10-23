import { motion } from 'framer-motion';
import { transition } from '../lib/motion';

/**
 * Where the text and the scholarship come from.
 *
 * Two of these licences require attribution, so this is not a courtesy: the app is only
 * allowed to use them while the credit is shown. The rest are here because a reader
 * ought to be able to see what they are reading and check it.
 */
const CREDITS = [
  {
    name: 'King James Version',
    what: 'The English text',
    terms: 'Public domain in the United States',
    note: 'Under perpetual Crown copyright in the United Kingdom.',
  },
  {
    name: 'Westminster Leningrad Codex',
    what: 'The Hebrew text, from Open Scriptures',
    terms: 'Creative Commons Attribution 4.0',
  },
  {
    name: 'SBL Greek New Testament',
    what: 'The Greek text, tagged by MorphGNT',
    terms: 'CC BY 4.0 tagging, under the SBLGNT licence',
  },
  {
    name: 'STEPBible Translators Brief Lexicon',
    what: 'What each Hebrew and Greek word means',
    terms: 'Creative Commons Attribution 4.0',
  },
];

export function About() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition('smooth')}
      style={{ display: 'grid', gap: 14 }}
    >
      {CREDITS.map((credit) => (
        <div key={credit.name}>
          <div style={{ fontWeight: 650, fontSize: 13 }}>{credit.name}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
            {credit.what}
          </div>
          <div style={{ color: 'var(--text-faint)', fontSize: 12, marginTop: 2 }}>
            {credit.terms}
            {credit.note ? ` · ${credit.note}` : ''}
          </div>
        </div>
      ))}

      <p
        style={{
          color: 'var(--text-faint)',
          fontSize: 12,
          lineHeight: 1.55,
          paddingTop: 12,
          borderTop: '1px solid var(--line-default)',
        }}
      >
        People and places are marked from a small hand-written set, not a scholarly dataset, and are
        marked as such until a proper one replaces it. Book introductions give the traditional view
        and the main scholarly alternative without choosing between them.
      </p>
    </motion.div>
  );
}
