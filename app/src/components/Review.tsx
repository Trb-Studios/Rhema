import { useEffect, useMemo, useRef, useState } from 'react';
import { SlidingHighlight } from './SlidingHighlight';
import { AnimatePresence, motion } from 'framer-motion';
import { useSaved } from '../lib/saved';
import type { SavedVerse } from '../lib/saved';
import { referenceOf } from '../lib/saved';
import { nextShowing, useReview } from '../lib/review';
import type { Grade } from '../lib/review';
import { sheetVariants, spring, transition } from '../lib/motion';
import { CheckIcon, CloseIcon } from './Icons';

type Mode = 'recall' | 'memorise';

/**
 * A review session.
 *
 * Recall shows a reference and asks for the verse; memorise shows the verse as first
 * letters, which is the step between reading a verse and knowing it. Both grade the
 * same way, and the grade decides when the verse comes back.
 */
export function Review({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { saved } = useSaved();
  const { cards, due, answer } = useReview();
  const [mode, setMode] = useState<Mode>('recall');
  const modeGroup = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);

  const savedById = useMemo(() => {
    const map = new Map<string, SavedVerse>();
    for (const verse of saved) {
      map.set(`${verse.bookId}:${verse.chapter}:${verse.verse}`, verse);
    }
    return map;
  }, [saved]);

  // Only cards whose verse is still saved can be shown.
  const queue = due.filter((card) => savedById.has(card.id));
  const card = queue[0];
  const verse = card ? savedById.get(card.id) : undefined;

  useEffect(() => {
    setShown(false);
  }, [card?.id]);

  // Escape closes it, and space reveals the answer, which is how every other
  // flashcard program behaves. The reader ignores keys while this is open.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (!card) return;
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        if (!shown) setShown(true);
        else grade('good');
        return;
      }
      if (!shown) return;
      const byNumber: Record<string, Grade> = {
        '1': 'again',
        '2': 'hard',
        '3': 'good',
        '4': 'easy',
      };
      const chosen = byNumber[event.key];
      if (chosen) {
        event.preventDefault();
        grade(chosen);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function grade(value: Grade) {
    if (!card) return;
    answer(card.id, value);
    setDone((count) => count + 1);
    setShown(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70,
            background: 'rgba(23, 20, 15, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'grid',
            placeItems: 'center',
            padding: 20,
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
            aria-label="Review"
            style={{
              width: 'min(640px, 100%)',
              background: 'var(--bg-card)',
              border: '1px solid var(--line-default)',
              borderRadius: 'var(--radius-panel)',
              boxShadow: 'var(--shadow-shell)',
              overflow: 'hidden',
            }}
          >
            <header
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 18px',
                borderBottom: '1px solid var(--line-default)',
              }}
            >
              <div
                ref={modeGroup}
                role="group"
                aria-label="How to review"
                style={{
                  position: 'relative',
                  display: 'flex',
                  gap: 2,
                  padding: 3,
                  borderRadius: 9,
                  background: 'var(--bg-sunken)',
                }}
              >
                <SlidingHighlight
                  container={modeGroup}
                  activeKey={mode}
                  style={{
                    borderRadius: 7,
                    background: 'var(--bg-selected)',
                    boxShadow: 'inset 0 1px 0 var(--glass-highlight)',
                  }}
                />
                {(
                  [
                    ['recall', 'Recall'],
                    ['memorise', 'Memorise'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    data-active={mode === id}
                    onClick={() => setMode(id)}
                    aria-pressed={mode === id}
                    style={{
                      position: 'relative',
                      padding: '5px 13px',
                      borderRadius: 7,
                      fontWeight: 600,
                      fontSize: 13,
                      color: mode === id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    <span style={{ position: 'relative' }}>{label}</span>
                  </button>
                ))}
              </div>

              <span className="tabular" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                {queue.length} to go
              </span>

              <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>
                Space to reveal · 1 to 4 to grade
              </span>

              <button
                onClick={onClose}
                aria-label="Close review"
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
            </header>

            <div style={{ padding: 26, minHeight: 280, display: 'grid', alignContent: 'center' }}>
              {!card || !verse ? (
                <Finished done={done} saved={saved.length} total={Object.keys(cards).length} />
              ) : (
                <>
                  <div
                    style={{
                      font: '600 11px var(--font-ui)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--text-tan)',
                      textAlign: 'center',
                    }}
                  >
                    {referenceOf(verse)}
                  </div>

                  <div
                    style={{
                      marginTop: 18,
                      fontFamily: 'var(--font-display)',
                      fontSize: 20,
                      lineHeight: 1.65,
                      textAlign: 'center',
                      textWrap: 'pretty',
                      minHeight: 100,
                    }}
                  >
                    {shown ? (
                      verse.text
                    ) : mode === 'memorise' ? (
                      <span style={{ letterSpacing: '0.06em' }}>{firstLetters(verse.text)}</span>
                    ) : (
                      <span style={{ color: 'var(--text-faint)' }}>What does this verse say?</span>
                    )}
                  </div>

                  {!shown ? (
                    <button
                      onClick={() => setShown(true)}
                      style={{
                        justifySelf: 'center',
                        marginTop: 22,
                        padding: '10px 22px',
                        borderRadius: 'var(--radius-control)',
                        background: 'var(--main-fill)',
                        color: 'var(--main-on)',
                        fontWeight: 600,
                      }}
                    >
                      Show it
                    </button>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 8,
                        marginTop: 22,
                        flexWrap: 'wrap',
                      }}
                    >
                      {(
                        [
                          ['again', 'Forgot'],
                          ['hard', 'Hard'],
                          ['good', 'Got it'],
                          ['easy', 'Easy'],
                        ] as const
                      ).map(([value, label]) => (
                        <motion.button
                          key={value}
                          whileTap={{ scale: 0.96 }}
                          transition={spring.snappy}
                          onClick={() => grade(value)}
                          style={{
                            display: 'grid',
                            gap: 2,
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-control)',
                            border: '1px solid var(--line-default)',
                            background: value === 'good' ? 'var(--main-fill)' : 'transparent',
                            color: value === 'good' ? 'var(--main-on)' : 'var(--text-primary)',
                            fontWeight: 600,
                          }}
                        >
                          {label}
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              opacity: 0.7,
                            }}
                          >
                            {nextShowing(card, value)}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Finished({ done, saved, total }: { done: number; saved: number; total: number }) {
  return (
    <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
      {saved === 0 ? (
        <>
          <p style={{ fontSize: 15, lineHeight: 1.6 }}>
            Nothing to review yet. Save a verse while you read and it will come back here, further
            apart each time you remember it.
          </p>
        </>
      ) : done > 0 ? (
        <>
          <span style={{ color: 'var(--main-fill)' }}>
            <CheckIcon size={34} />
          </span>
          <p style={{ marginTop: 12, fontSize: 17, color: 'var(--text-primary)' }}>
            {done} reviewed. Nothing else due today.
          </p>
          <p style={{ marginTop: 6, fontSize: 13 }}>
            {total} {total === 1 ? 'verse' : 'verses'} in review.
          </p>
        </>
      ) : (
        <p style={{ fontSize: 15, lineHeight: 1.6 }}>
          Nothing due today. {total} {total === 1 ? 'verse is' : 'verses are'} in review and will
          come back when they are due.
        </p>
      )}
    </div>
  );
}

/**
 * The first letter of each word, with punctuation kept.
 *
 * This is the standard way to practise a verse: enough to prompt the memory without
 * giving it away, and it gets you from reading a verse to knowing it.
 */
function firstLetters(text: string): string {
  return text
    .split(/\s+/)
    .map((word) => {
      const letters = word.replace(/[^A-Za-z]/g, '');
      if (!letters) return word;
      const start = word.indexOf(letters[0]);
      const tail = word.slice(start + letters.length);
      return word.slice(0, start) + letters[0] + tail;
    })
    .join(' ');
}
