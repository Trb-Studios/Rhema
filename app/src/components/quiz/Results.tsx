import { useEffect, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import type { Book } from '../../lib/bible';
import type { Level } from '../../lib/quizbank';
import { starsFor } from '../../lib/quizscores';
import { parseRef } from '../../lib/profiles';
import { navigate } from '../../lib/nav';
import { prefersReducedMotion, spring, transition } from '../../lib/motion';
import type { RoundResult } from './Play';
import { Confetti } from './Confetti';
import { HeartIcon, TrophyIcon } from '../Icons';

const NEXT_LEVEL: Record<Level, Level | null> = { easy: 'medium', medium: 'hard', hard: null };

/**
 * The end of a round: how it went, the stars, and every question missed with the verse
 * that answers it — the part worth reading again.
 */
export function Results({
  book,
  books,
  level,
  result,
  best,
  isBest,
  onAgain,
  onLevel,
  onDone,
}: {
  book: Book;
  books: Book[];
  level: Level;
  result: RoundResult;
  best: number;
  isBest: boolean;
  onAgain: () => void;
  onLevel: (level: Level) => void;
  onDone: () => void;
}) {
  const accuracy = result.answered ? result.right / result.answered : 0;
  const stars = starsFor(accuracy, result.finished);
  const [fire, setFire] = useState(0);
  const shown = useMotionValue(0);
  const text = useTransform(shown, (latest) => Math.round(latest).toLocaleString());

  useEffect(() => {
    if (prefersReducedMotion()) shown.set(result.score);
    else {
      const controls = animate(shown, result.score, { duration: 1.4, ease: [0.22, 1, 0.36, 1] });
      return () => controls.stop();
    }
  }, [result.score, shown]);

  useEffect(() => {
    if (result.finished && stars >= 2) {
      const timer = window.setTimeout(() => setFire(Date.now()), 350);
      return () => window.clearTimeout(timer);
    }
  }, [result.finished, stars]);

  const next = NEXT_LEVEL[level];

  return (
    <div style={{ position: 'relative', height: '100%', overflowY: 'auto' }}>
      <Confetti fire={fire} />
      <div
        style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 64px', textAlign: 'center' }}
      >
        <motion.div
          initial={{ scale: 0.4, opacity: 0, rotate: result.finished ? -12 : 0 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={spring.bouncy}
          style={{
            width: 92,
            height: 92,
            margin: '0 auto',
            borderRadius: 28,
            display: 'grid',
            placeItems: 'center',
            background: result.finished
              ? 'radial-gradient(circle at 30% 25%, #f6dc8c, var(--ai-sparkle) 55%, #b98a1f)'
              : 'var(--bad-tint)',
            color: result.finished ? '#3d2c06' : 'var(--bad)',
            boxShadow: result.finished
              ? '0 18px 50px color-mix(in srgb, var(--ai-sparkle) 35%, transparent)'
              : 'none',
          }}
        >
          {result.finished ? <TrophyIcon size={46} tint="#fff3c4" /> : <HeartIcon size={44} />}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transition('smooth'), delay: 0.1 }}
          style={{ fontSize: 44, marginTop: 18 }}
        >
          {result.finished
            ? stars === 3
              ? 'Superb.'
              : stars === 2
                ? 'Well done.'
                : 'Round complete.'
            : 'Out of lives'}
        </motion.h1>
        <p style={{ marginTop: 6, color: 'var(--text-secondary)' }}>
          {result.finished
            ? `${book.name}, ${level}: ${result.right} of ${result.total} right`
            : `You reached question ${result.answered} of ${result.total}. The verses below will help next time.`}
        </p>

        {result.finished && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}>
            {[1, 2, 3].map((star) => (
              <motion.span
                key={star}
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: star <= stars ? 1 : 0.8, rotate: 0 }}
                transition={{ ...spring.bouncy, delay: 0.35 + star * 0.18 }}
                style={{
                  fontSize: 44,
                  lineHeight: 1,
                  color: star <= stars ? 'var(--ai-sparkle)' : 'var(--bg-selected)',
                  filter:
                    star <= stars
                      ? 'drop-shadow(0 6px 14px color-mix(in srgb, var(--ai-sparkle) 45%, transparent))'
                      : 'none',
                }}
              >
                ★
              </motion.span>
            ))}
          </div>
        )}

        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 26 }}
        >
          <Stat label="Score">
            <motion.span>{text}</motion.span>
            {isBest && result.score > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...spring.bouncy, delay: 1.2 }}
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--ai-sparkle)',
                  letterSpacing: '0.08em',
                }}
              >
                NEW BEST
              </motion.span>
            )}
          </Stat>
          <Stat label="Accuracy">{Math.round(accuracy * 100)}%</Stat>
          <Stat label="Best run">{result.bestStreak} in a row</Stat>
        </div>
        {!isBest && best > 0 && (
          <p
            className="tabular"
            style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-faint)' }}
          >
            Your best on {level}: {best.toLocaleString()}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'center',
            marginTop: 26,
            flexWrap: 'wrap',
          }}
        >
          <Button primary onClick={onAgain}>
            Play again
          </Button>
          {result.finished && next && stars >= 2 && (
            <Button onClick={() => onLevel(next)}>Try {next}</Button>
          )}
          <Button onClick={onDone}>Back to {book.name}</Button>
        </div>

        {result.missed.length > 0 && (
          <div style={{ marginTop: 40, textAlign: 'start' }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              To go over · {result.missed.length}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {result.missed.map((asked, index) => {
                const at = parseRef(asked.question.r);
                const refBook = at
                  ? books.find((candidate) => candidate.id === at.bookId)
                  : undefined;
                const answer =
                  typeof asked.question.a === 'string'
                    ? asked.question.a
                    : typeof asked.question.a === 'boolean'
                      ? asked.question.a
                        ? 'True'
                        : 'False'
                      : (asked.question.items?.join(' → ') ??
                        asked.question.pairs?.map(([a, b]) => `${a}: ${b}`).join(', ') ??
                        asked.question.text?.replace(/\[([^\]]+)\]/g, '$1') ??
                        '');
                return (
                  <motion.div
                    key={asked.question.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...transition('smooth'), delay: 0.5 + index * 0.04 }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: '1px solid var(--line-default)',
                      background: 'var(--bg-card)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{asked.question.q}</div>
                    <div style={{ marginTop: 4, fontSize: 13.5, color: 'var(--good)' }}>
                      {answer}
                    </div>
                    {at && refBook && (
                      <button
                        onClick={() => navigate({ screen: 'read', ...at })}
                        className="tabular"
                        style={{
                          marginTop: 6,
                          font: '650 12px var(--font-ui)',
                          color: 'var(--text-tan)',
                        }}
                      >
                        Read {refBook.name} {at.chapter}:{at.verse} →
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '14px 12px',
        borderRadius: 14,
        background: 'var(--bg-card)',
        border: '1px solid var(--line-default)',
      }}
    >
      <div className="eyebrow">{label}</div>
      <div className="tabular" style={{ marginTop: 6, font: '400 28px var(--font-display)' }}>
        {children}
      </div>
    </div>
  );
}

function Button({
  children,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      transition={spring.snappy}
      onClick={onClick}
      style={{
        height: 44,
        padding: '0 20px',
        borderRadius: 12,
        fontWeight: 700,
        fontSize: 14,
        background: primary ? 'var(--main-fill)' : 'var(--bg-sunken)',
        color: primary ? 'var(--main-on)' : 'var(--text-primary)',
        border: primary ? 'none' : '1px solid var(--line-default)',
      }}
    >
      {children}
    </motion.button>
  );
}
