import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { EditionId } from '../lib/editions';
import { occurrencesIn, parse, strongsOf, totalFor, wordsForBook } from '../lib/words';
import type { Word } from '../lib/words';
import { popoverVariants, transition } from '../lib/motion';

export type WordAnchor = {
  word: Word;
  edition: EditionId;
  bookId: number;
  book: string;
  x: number;
  y: number;
};

const WIDTH = 320;

/**
 * What a word in the Hebrew or Greek is: how it is written here, its dictionary form,
 * how it is parsed, and where else it occurs.
 */
export function WordPopover({
  anchor,
  onClose,
  onGo,
}: {
  anchor: WordAnchor | null;
  onClose: () => void;
  onGo: (chapter: number, verse: number) => void;
}) {
  const [total, setTotal] = useState<number | null>(null);
  const [here, setHere] = useState<string[]>([]);

  useEffect(() => {
    if (!anchor) return;
    const [, lemma] = anchor.word;
    setTotal(null);
    setHere([]);
    if (!lemma) return;

    void totalFor(anchor.edition, lemma).then(setTotal);
    void wordsForBook(anchor.edition, anchor.bookId).then((book) => {
      if (book) setHere(occurrencesIn(book, anchor.edition, lemma));
    });
  }, [anchor]);

  useEffect(() => {
    if (!anchor) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [anchor, onClose]);

  if (!anchor) return <AnimatePresence />;

  const [written, lemma, code] = anchor.word;
  const parsing = parse(anchor.edition, code);
  const strongs = strongsOf(anchor.edition, lemma);
  const isHebrew = anchor.edition === 'hebrew';

  return (
    <AnimatePresence>
      <>
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
          aria-hidden="true"
        />
        <motion.div
          role="dialog"
          aria-label={`The word ${written}`}
          variants={popoverVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition('snappy')}
          style={{
            position: 'fixed',
            zIndex: 51,
            left: Math.min(
              Math.max(12, anchor.x - WIDTH / 2),
              Math.max(12, window.innerWidth - WIDTH - 12),
            ),
            top: Math.min(anchor.y + 10, Math.max(12, window.innerHeight - 300)),
            width: WIDTH,
            maxHeight: 340,
            overflowY: 'auto',
            transformOrigin: 'top center',
            padding: 16,
            borderRadius: 'var(--radius-card)',
            background: 'var(--bg-card)',
            border: '1px solid var(--line-default)',
            boxShadow: 'var(--shadow-shell)',
          }}
        >
          <div
            style={{
              font: '600 11px var(--font-ui)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-tan)',
            }}
          >
            {isHebrew ? 'Hebrew' : 'Greek'}
          </div>

          <div
            dir={isHebrew ? 'rtl' : 'ltr'}
            style={{
              fontFamily: isHebrew ? 'var(--font-hebrew)' : 'var(--font-greek)',
              fontSize: 30,
              lineHeight: 1.35,
              marginTop: 6,
              textAlign: 'start',
            }}
          >
            {written}
          </div>

          {lemma && lemma !== written && (
            <Row label="Dictionary form">
              <span
                dir={isHebrew ? 'rtl' : 'ltr'}
                style={{ fontFamily: isHebrew ? 'var(--font-hebrew)' : 'var(--font-greek)' }}
              >
                {isHebrew ? (strongs ?? lemma) : lemma}
              </span>
            </Row>
          )}

          {parsing.length > 0 ? (
            <Row label="Parsing">{parsing.join(', ')}</Row>
          ) : (
            code && <Row label="Parsing code">{code}</Row>
          )}

          {total !== null && (
            <Row label="Occurs">
              {total.toLocaleString()} {total === 1 ? 'time' : 'times'} in the{' '}
              {isHebrew ? 'Old' : 'New'} Testament
            </Row>
          )}

          {here.length > 0 && (
            <>
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: '1px solid var(--line-default)',
                  font: '600 11px var(--font-ui)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                }}
              >
                {here.length} {here.length === 1 ? 'verse' : 'verses'} in {anchor.book}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {here.slice(0, 40).map((reference) => {
                  const [chapter, verse] = reference.split(':').map(Number);
                  return (
                    <button
                      key={reference}
                      onClick={() => onGo(chapter, verse)}
                      className="tabular"
                      style={{
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: 'var(--bg-sunken)',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {reference}
                    </button>
                  );
                })}
                {here.length > 40 && (
                  <span style={{ color: 'var(--text-faint)', fontSize: 12, alignSelf: 'center' }}>
                    and {here.length - 40} more
                  </span>
                )}
              </div>
            </>
          )}
        </motion.div>
      </>
    </AnimatePresence>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 9, fontSize: 13, lineHeight: 1.5 }}>
      <span style={{ color: 'var(--text-secondary)', flex: 'none', minWidth: 96 }}>{label}</span>
      <span>{children}</span>
    </div>
  );
}
