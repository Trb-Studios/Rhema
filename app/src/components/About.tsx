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
  {
    name: 'STEPBible TIPNR',
    what: 'Who and where: every person and place, with their family',
    terms: 'Creative Commons Attribution 4.0',
    note: 'From Tyndale House Cambridge.',
  },
  {
    name: 'OpenBible cross-references',
    what: 'Where else Scripture says this',
    terms: 'Creative Commons Attribution 4.0',
    note: 'Built on the Treasury of Scripture Knowledge, ranked by reader votes.',
  },
  {
    name: "Easton's Bible Dictionary (1897)",
    what: 'Who a person was and what a place was, on each profile',
    terms: 'Public domain',
    note: 'Matched to each individual by Theographic Bible Metadata.',
  },
  {
    name: 'Theographic Bible Metadata',
    what: 'Which dictionary entry belongs to which individual, titles and dates',
    terms: 'Creative Commons Attribution-ShareAlike 4.0',
    note: 'By Robert Rouse. Dates follow the chronology of Floyd Nolen Jones.',
  },
  {
    name: 'OpenBible.info geocoding',
    what: 'Where each place is now, how sure that is, and its photograph',
    terms: 'Creative Commons Attribution 4.0',
    note: 'Each photograph carries its own credit and licence on the profile.',
  },
  {
    name: 'Wikimedia Commons and Wikidata',
    what: 'Portraits of people',
    terms: 'Public domain or Creative Commons; credited on each profile',
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
        People and places are marked as individuals rather than as names, so the Mary of one passage
        is not the Mary of another. Every mark is checked against this translation's own text before
        it is kept, which is why a few names the King James spells differently are left unmarked
        rather than marked on the wrong word. Profiles quote Easton's dictionary, a work of 1897
        scholarship. Notes on disputed identifications and the quiz were written with AI help and
        checked against the verses they cite; they carry the gold sparkle wherever they appear. Book
        introductions give the traditional view and the main scholarly alternative without choosing
        between them.
      </p>
    </motion.div>
  );
}
