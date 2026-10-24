import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Book } from '../../lib/bible';
import type { Question } from '../../lib/quizbank';
import { seeded, shuffle } from '../../lib/quizbank';
import { parseRef } from '../../lib/profiles';
import { navigate } from '../../lib/nav';
import { spring, transition } from '../../lib/motion';
import { ArrowIcon, CheckIcon, CloseIcon, SparkleIcon } from '../Icons';

/** What goes on the back of a card. */
function answerOf(question: Question): string {
  if (typeof question.a === 'boolean') return question.a ? 'True' : 'False';
  if (typeof question.a === 'string') return question.a;
  if (question.items) return question.items.map((item, at) => `${at + 1}. ${item}`).join('\n');
  if (question.pairs) return question.pairs.map(([left, right]) => `${left} — ${right}`).join('\n');
  if (question.text) return question.text.replace(/\[([^\]]+)\]/g, '$1');
  return '';
}

/**
 * Studying before testing: the book's questions as cards that flip.
 *
 * Space turns a card over. Marking a card "Again" puts it back at the end of the deck,
 * so the ones that will not stick keep coming round until they do.
 */
export function Flashcards({
  book,
  books,
  bank,
  onQuit,
}: {
  book: Book;
  books: Book[];
  bank: Question[];
  onQuit: () => void;
}) {
  const initial = useMemo(() => shuffle(bank, seeded(Date.now())), [bank]);
  const [deck, setDeck] = useState(initial);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [direction, setDirection] = useState(1);
  const card = deck[0];

  const resolve = useCallback(
    (gotIt: boolean) => {
      if (!card) return;
      setDirection(gotIt ? 1 : -1);
      setFlipped(false);
      setDeck((current) => (gotIt ? current.slice(1) : [...current.slice(1), current[0]]));
      if (gotIt) setKnown((value) => value + 1);
    },
    [card],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onQuit();
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        setFlipped((value) => !value);
      }
      if (flipped && (event.key === 'ArrowRight' || event.key === '2')) resolve(true);
      if (flipped && (event.key === 'ArrowLeft' || event.key === '1')) resolve(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, resolve, onQuit]);

  const at = card ? parseRef(card.r) : null;
  const refBook = at ? books.find((candidate) => candidate.id === at.bookId) : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '14px 22px',
          borderBottom: '1px solid var(--line-default)',
        }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onQuit}
          aria-label="Leave the flashcards"
          className="row-hover"
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <CloseIcon size={16} />
        </motion.button>
        <strong style={{ fontSize: 14 }}>{book.name} flashcards</strong>
        <span style={{ flex: 1 }} />
        <span className="tabular" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {known} known · {deck.length} to go
        </span>
        <div
          style={{
            width: 160,
            height: 6,
            borderRadius: 6,
            background: 'var(--bg-selected)',
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{ width: `${(known / Math.max(1, bank.length)) * 100}%` }}
            transition={transition('smooth')}
            style={{ height: '100%', background: 'var(--good)' }}
          />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          perspective: 1400,
        }}
      >
        <AnimatePresence mode="popLayout" custom={direction}>
          {card ? (
            <motion.div
              key={card.id + deck.length}
              custom={direction}
              initial={{ opacity: 0, y: 30, rotate: direction * 2, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
              exit={{
                opacity: 0,
                x: direction * 320,
                rotate: direction * 10,
                transition: { duration: 0.28 },
              }}
              transition={transition('smooth')}
              style={{ width: 'min(620px, 100%)' }}
            >
              <motion.div
                onClick={() => setFlipped((value) => !value)}
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                style={{
                  position: 'relative',
                  height: 360,
                  transformStyle: 'preserve-3d',
                  cursor: 'pointer',
                }}
              >
                {/* Front */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    borderRadius: 22,
                    padding: 32,
                    display: 'flex',
                    flexDirection: 'column',
                    background:
                      'radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--main-fill) 10%, var(--bg-card)), var(--bg-card))',
                    border: '1px solid var(--line-default)',
                    boxShadow: 'var(--shadow-pop)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="eyebrow">Question</span>
                    <SparkleIcon size={13} title="Written with AI" />
                  </div>
                  <div
                    style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center' }}
                  >
                    <h2 style={{ fontSize: 28, lineHeight: 1.3 }}>{card.q}</h2>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-faint)' }}>
                    Click or press <kbd className="kbd">Space</kbd> to turn over
                  </div>
                </div>
                {/* Back */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    transform: 'rotateY(180deg)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    borderRadius: 22,
                    padding: 32,
                    display: 'flex',
                    flexDirection: 'column',
                    background:
                      'radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, var(--good) 10%, var(--bg-card)), var(--bg-card))',
                    border: '1px solid color-mix(in srgb, var(--good) 30%, var(--line-default))',
                    boxShadow: 'var(--shadow-pop)',
                  }}
                >
                  <span className="eyebrow" style={{ color: 'var(--good)' }}>
                    Answer
                  </span>
                  <p
                    style={{
                      marginTop: 8,
                      fontSize: 13.5,
                      color: 'var(--text-faint)',
                      lineHeight: 1.5,
                    }}
                  >
                    {card.q}
                  </p>
                  <div
                    style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center' }}
                  >
                    <div>
                      <div
                        style={{ font: '400 30px/1.3 var(--font-display)', whiteSpace: 'pre-line' }}
                      >
                        {answerOf(card)}
                      </div>
                      {card.x && (
                        <p
                          style={{
                            marginTop: 14,
                            fontSize: 14,
                            lineHeight: 1.6,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {card.x}
                        </p>
                      )}
                    </div>
                  </div>
                  {at && refBook && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate({ screen: 'read', ...at });
                      }}
                      className="tabular"
                      style={{
                        alignSelf: 'center',
                        font: '650 12.5px var(--font-ui)',
                        color: 'var(--text-tan)',
                      }}
                    >
                      {refBook.name} {at.chapter}:{at.verse} →
                    </button>
                  )}
                </div>
              </motion.div>

              <AnimatePresence>
                {flipped && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={spring.snappy}
                    style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18 }}
                  >
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => resolve(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        height: 44,
                        padding: '0 18px',
                        borderRadius: 12,
                        background: 'var(--bad-tint)',
                        color: 'var(--bad)',
                        fontWeight: 700,
                      }}
                    >
                      <ArrowIcon dir="left" size={16} /> Again <kbd className="kbd">1</kbd>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => resolve(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        height: 44,
                        padding: '0 18px',
                        borderRadius: 12,
                        background: 'var(--good-tint)',
                        color: 'var(--good)',
                        fontWeight: 700,
                      }}
                    >
                      Know it <CheckIcon size={16} tint="var(--good)" />{' '}
                      <kbd className="kbd">2</kbd>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={spring.bouncy}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: 54 }}>✓</div>
              <h2 style={{ fontSize: 34, marginTop: 6 }}>Every card known</h2>
              <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>
                {bank.length} cards from {book.name}. Ready to be quizzed on them?
              </p>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onQuit}
                style={{
                  marginTop: 18,
                  height: 42,
                  padding: '0 20px',
                  borderRadius: 12,
                  background: 'var(--main-fill)',
                  color: 'var(--main-on)',
                  fontWeight: 700,
                }}
              >
                Back to {book.name}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
