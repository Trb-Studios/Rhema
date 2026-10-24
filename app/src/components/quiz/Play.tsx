import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, Reorder, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import type { Book } from '../../lib/bible';
import { chapter as loadChapter } from '../../lib/bible';
import type { Asked, Level } from '../../lib/quizbank';
import { LIVES, isRight, pointsFor, timeFor } from '../../lib/quizbank';
import { parseRef } from '../../lib/profiles';
import { prefersReducedMotion, spring, transition } from '../../lib/motion';
import { BoltIcon, CheckIcon, CloseIcon, FlameIcon, HeartIcon, SparkleIcon } from '../Icons';

export type RoundResult = {
  score: number;
  right: number;
  answered: number;
  total: number;
  finished: boolean;
  missed: Asked[];
  bestStreak: number;
};

type Outcome = { correct: boolean; points: number; timedOut?: boolean };

const FOCUS_LABEL = { story: 'The story', god: 'What it shows of God', remember: 'Worth remembering' };

/**
 * One round of the quiz, question by question.
 *
 * Each answer is met at once — a glow and points for a right one, a shake and the right
 * answer for a wrong one — and then the verse it rests on, so every question teaches
 * whether or not it was got right.
 */
export function Play({
  book,
  books,
  level,
  round,
  onFinish,
  onQuit,
}: {
  book: Book;
  books: Book[];
  level: Level;
  round: Asked[];
  onFinish: (result: RoundResult) => void;
  onQuit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState(LIVES[level]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [right, setRight] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [missed, setMissed] = useState<Asked[]>([]);
  const [shake, setShake] = useState(0);

  const asked = round[index];
  const limit = asked ? timeFor(level, asked) : null;
  const [left, setLeft] = useState<number | null>(limit);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    setLeft(limit);
    startedAt.current = Date.now();
  }, [index, limit]);

  const answer = useCallback(
    (correct: boolean, timedOut = false) => {
      if (outcome || !asked) return;
      const secondsLeft = limit === null ? null : Math.max(0, limit - (Date.now() - startedAt.current) / 1000);
      if (correct) {
        const points = pointsFor(level, secondsLeft, streak);
        setScore((value) => value + points);
        setStreak((value) => {
          setBestStreak((best) => Math.max(best, value + 1));
          return value + 1;
        });
        setRight((value) => value + 1);
        setOutcome({ correct, points });
      } else {
        setStreak(0);
        setLives((value) => value - 1);
        setMissed((list) => [...list, asked]);
        setShake((value) => value + 1);
        setOutcome({ correct, points: 0, timedOut });
      }
    },
    [outcome, asked, limit, level, streak],
  );

  // The clock. Running out counts as a wrong answer.
  useEffect(() => {
    if (limit === null || outcome) return;
    const timer = window.setInterval(() => {
      const remaining = limit - (Date.now() - startedAt.current) / 1000;
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) answer(false, true);
    }, 100);
    return () => window.clearInterval(timer);
  }, [limit, outcome, answer]);

  const next = useCallback(() => {
    if (!outcome) return;
    const out = lives <= 0;
    const last = index >= round.length - 1;
    if (out || last) {
      onFinish({
        score,
        right,
        answered: index + 1,
        total: round.length,
        finished: !out,
        missed,
        bestStreak,
      });
      return;
    }
    setOutcome(null);
    setIndex((value) => value + 1);
  }, [outcome, lives, index, round.length, onFinish, score, right, missed, bestStreak]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onQuit();
      if (outcome && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [outcome, next, onQuit]);

  if (!asked) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* The heads-up bar: progress, lives, streak, score, clock. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: '1px solid var(--line-default)' }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onQuit}
          aria-label="Leave the quiz"
          className="row-hover"
          style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }}
        >
          <CloseIcon size={16} />
        </motion.button>
        <div style={{ flex: 1, display: 'flex', gap: 3 }}>
          {round.map((_, at) => (
            <motion.span
              key={at}
              initial={false}
              animate={{
                background:
                  at < index || (at === index && outcome)
                    ? missed.includes(round[at])
                      ? 'var(--bad)'
                      : 'var(--good)'
                    : at === index
                      ? 'var(--main-fill)'
                      : 'var(--bg-selected)',
                scaleY: at === index ? 1.6 : 1,
              }}
              transition={transition('smooth')}
              style={{ flex: 1, height: 4, borderRadius: 4 }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 3 }} aria-label={`${lives} lives left`}>
          {Array.from({ length: LIVES[level] }, (_, at) => (
            <motion.span
              key={at}
              animate={at < lives ? { scale: 1, opacity: 1, rotate: 0 } : { scale: 0.7, opacity: 0.25, rotate: -18 }}
              transition={spring.bouncy}
              style={{ color: 'var(--bad)', display: 'grid' }}
            >
              <HeartIcon size={18} filled={at < lives} />
            </motion.span>
          ))}
        </div>
        <AnimatePresence>
          {streak >= 2 && (
            <motion.span
              key="streak"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={spring.bouncy}
              className="tabular"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                height: 26,
                padding: '0 9px 0 6px',
                borderRadius: 99,
                background: 'var(--status-pending-bg)',
                color: 'var(--status-pending-text)',
                font: '700 12px var(--font-ui)',
              }}
            >
              <FlameIcon size={15} tint="var(--warn)" />
              {streak}× · x{(1 + Math.min(streak, 4) * 0.25).toFixed(2).replace(/\.?0+$/, '')}
            </motion.span>
          )}
        </AnimatePresence>
        <Counter value={score} />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'grid', placeItems: 'start center', padding: '34px 22px 40px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 40, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.98, transition: { duration: 0.16 } }}
            transition={transition('smooth')}
            style={{ width: 'min(720px, 100%)' }}
          >
            <motion.div
              key={shake}
              animate={shake && outcome && !outcome.correct ? { x: [0, -12, 11, -7, 6, -3, 0] } : { x: 0 }}
              transition={{ duration: 0.45 }}
            >
              <QuestionCard
                asked={asked}
                number={index + 1}
                total={round.length}
                left={left}
                limit={limit}
                outcome={outcome}
                onAnswer={answer}
              />
            </motion.div>

            <AnimatePresence>
              {outcome && (
                <Feedback key="feedback" asked={asked} outcome={outcome} books={books} book={book} onNext={next} last={index >= round.length - 1 || lives <= 0} />
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** The score, counting up to its new value rather than jumping. */
function Counter({ value }: { value: number }) {
  const shown = useMotionValue(value);
  const text = useTransform(shown, (latest) => Math.round(latest).toLocaleString());
  useEffect(() => {
    if (prefersReducedMotion()) {
      shown.set(value);
      return;
    }
    const controls = animate(shown, value, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [value, shown]);
  return (
    <motion.span
      key={value}
      initial={{ scale: 1.15 }}
      animate={{ scale: 1 }}
      transition={spring.bouncy}
      className="tabular"
      style={{ minWidth: 72, textAlign: 'end', font: '700 18px var(--font-ui)', color: 'var(--text-primary)' }}
    >
      <motion.span>{text}</motion.span>
    </motion.span>
  );
}

function TimerRing({ left, limit }: { left: number; limit: number }) {
  const fraction = Math.max(0, left / limit);
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const urgent = left <= 10;
  return (
    <motion.div
      animate={urgent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={urgent ? { repeat: Infinity, duration: 1 } : undefined}
      style={{ position: 'relative', width: 44, height: 44 }}
      aria-label={`${Math.ceil(left)} seconds left`}
    >
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="var(--bg-selected)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={urgent ? 'var(--bad)' : 'var(--main-fill)'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          transform="rotate(-90 22 22)"
          style={{ transition: 'stroke-dashoffset 100ms linear, stroke 200ms' }}
        />
      </svg>
      <span
        className="tabular"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          font: '700 12px var(--font-ui)',
          color: urgent ? 'var(--bad)' : 'var(--text-secondary)',
        }}
      >
        {Math.ceil(left)}
      </span>
    </motion.div>
  );
}

function QuestionCard({
  asked,
  number,
  total,
  left,
  limit,
  outcome,
  onAnswer,
}: {
  asked: Asked;
  number: number;
  total: number;
  left: number | null;
  limit: number | null;
  outcome: Outcome | null;
  onAnswer: (correct: boolean) => void;
}) {
  const glow = outcome ? (outcome.correct ? 'var(--good)' : 'var(--bad)') : 'transparent';
  return (
    <div
      style={{
        position: 'relative',
        padding: '26px 28px 28px',
        borderRadius: 20,
        background: 'var(--bg-card)',
        border: `1px solid ${outcome ? glow : 'var(--line-default)'}`,
        boxShadow: outcome
          ? `0 0 0 4px color-mix(in srgb, ${glow} 16%, transparent), var(--shadow-raised)`
          : 'var(--shadow-raised)',
        transition: 'box-shadow 250ms, border-color 250ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="eyebrow">
          Question {number} of {total}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>· {FOCUS_LABEL[asked.question.f]}</span>
        <span style={{ display: 'grid' }} title="Written with AI">
          <SparkleIcon size={13} />
        </span>
        <span style={{ flex: 1 }} />
        {left !== null && limit !== null && <TimerRing left={left} limit={limit} />}
      </div>
      <h2 style={{ fontSize: 26, lineHeight: 1.3, marginTop: 12 }}>{asked.question.q}</h2>

      <div style={{ marginTop: 22 }}>
        {asked.as === 'choice' && <Choice asked={asked} outcome={outcome} onAnswer={onAnswer} />}
        {asked.as === 'tf' && <TrueFalse asked={asked} outcome={outcome} onAnswer={onAnswer} />}
        {asked.as === 'typed' && <Typed asked={asked} outcome={outcome} onAnswer={onAnswer} />}
        {asked.as === 'order' && <Order asked={asked} outcome={outcome} onAnswer={onAnswer} />}
        {asked.as === 'match' && <Match asked={asked} outcome={outcome} onAnswer={onAnswer} />}
        {asked.as === 'fill' && <Fill asked={asked} outcome={outcome} onAnswer={onAnswer} />}
      </div>
    </div>
  );
}

function OptionButton({
  children,
  state,
  onClick,
  hotkey,
  delay = 0,
}: {
  children: ReactNode;
  state: 'idle' | 'right' | 'wrong' | 'dim';
  onClick?: () => void;
  hotkey?: string;
  delay?: number;
}) {
  const colours = {
    idle: ['var(--bg-sunken)', 'var(--line-default)', 'var(--text-primary)'],
    right: ['var(--good-tint)', 'var(--good)', 'var(--good)'],
    wrong: ['var(--bad-tint)', 'var(--bad)', 'var(--bad)'],
    dim: ['var(--bg-sunken)', 'var(--line-default)', 'var(--text-faint)'],
  }[state];
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, scale: state === 'right' ? [1, 1.03, 1] : 1 }}
      transition={{ ...spring.snappy, delay }}
      whileHover={state === 'idle' ? { y: -2, borderColor: 'var(--line-strong)' } : undefined}
      whileTap={state === 'idle' ? { scale: 0.98 } : undefined}
      onClick={onClick}
      disabled={!onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        minHeight: 52,
        padding: '12px 16px',
        textAlign: 'start',
        borderRadius: 13,
        background: colours[0],
        border: `1.5px solid ${colours[1]}`,
        color: colours[2],
        fontSize: 15,
        fontWeight: 600,
      }}
    >
      {hotkey && <kbd className="kbd">{hotkey}</kbd>}
      <span style={{ flex: 1 }}>{children}</span>
      {state === 'right' && <CheckIcon size={18} tint="var(--good)" />}
      {state === 'wrong' && <CloseIcon size={18} />}
    </motion.button>
  );
}

function Choice({
  asked,
  outcome,
  onAnswer,
}: {
  asked: Extract<Asked, { as: 'choice' }>;
  outcome: Outcome | null;
  onAnswer: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const pick = useCallback(
    (option: string) => {
      if (outcome) return;
      setPicked(option);
      onAnswer(option === asked.answer);
    },
    [outcome, asked.answer, onAnswer],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const number = Number(event.key);
      if (number >= 1 && number <= asked.options.length) pick(asked.options[number - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [asked.options, pick]);

  return (
    <div style={{ display: 'grid', gap: 9 }}>
      {asked.options.map((option, at) => (
        <OptionButton
          key={option}
          hotkey={String(at + 1)}
          delay={at * 0.04}
          state={
            !outcome
              ? 'idle'
              : option === asked.answer
                ? 'right'
                : option === picked
                  ? 'wrong'
                  : 'dim'
          }
          onClick={outcome ? undefined : () => pick(option)}
        >
          {option}
        </OptionButton>
      ))}
    </div>
  );
}

function TrueFalse({
  asked,
  outcome,
  onAnswer,
}: {
  asked: Extract<Asked, { as: 'tf' }>;
  outcome: Outcome | null;
  onAnswer: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<boolean | null>(null);
  const pick = (value: boolean) => {
    if (outcome) return;
    setPicked(value);
    onAnswer(value === asked.answer);
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {[true, false].map((value, at) => (
        <OptionButton
          key={String(value)}
          hotkey={String(at + 1)}
          delay={at * 0.05}
          state={!outcome ? 'idle' : value === asked.answer ? 'right' : value === picked ? 'wrong' : 'dim'}
          onClick={outcome ? undefined : () => pick(value)}
        >
          {value ? 'True' : 'False'}
        </OptionButton>
      ))}
    </div>
  );
}

function Typed({
  asked,
  outcome,
  onAnswer,
}: {
  asked: Extract<Asked, { as: 'typed' }>;
  outcome: Outcome | null;
  onAnswer: (correct: boolean) => void;
}) {
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  const submit = () => {
    if (outcome || !value.trim()) return;
    onAnswer(isRight(value, asked.answer, asked.accept, asked.wrong));
  };
  const tone = outcome ? (outcome.correct ? 'var(--good)' : 'var(--bad)') : 'var(--line-strong)';
  return (
    <div>
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          ref={input}
          value={value}
          disabled={Boolean(outcome)}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.stopPropagation();
              submit();
            }
          }}
          placeholder="Type your answer — spelling doesn't need to be perfect"
          style={{
            flex: 1,
            height: 52,
            padding: '0 16px',
            borderRadius: 13,
            border: `1.5px solid ${tone}`,
            background: 'var(--bg-sunken)',
            color: 'var(--text-primary)',
            fontSize: 16,
            outline: 'none',
          }}
        />
        {!outcome && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={submit}
            style={{
              height: 52,
              padding: '0 20px',
              borderRadius: 13,
              background: 'var(--main-fill)',
              color: 'var(--main-on)',
              fontWeight: 700,
            }}
          >
            Answer
          </motion.button>
        )}
      </div>
      {outcome && !outcome.correct && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 10, fontSize: 14 }}>
          The answer is <strong style={{ color: 'var(--good)' }}>{asked.answer}</strong>
          {value.trim() && <span style={{ color: 'var(--text-faint)' }}> — you wrote “{value.trim()}”</span>}
        </motion.p>
      )}
    </div>
  );
}

function Order({
  asked,
  outcome,
  onAnswer,
}: {
  asked: Extract<Asked, { as: 'order' }>;
  outcome: Outcome | null;
  onAnswer: (correct: boolean) => void;
}) {
  const [items, setItems] = useState(asked.shuffled);
  return (
    <div>
      <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginBottom: 10 }}>Drag into order, first at the top.</p>
      <Reorder.Group axis="y" values={items} onReorder={outcome ? () => {} : setItems} style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        {items.map((item, at) => {
          const placed = outcome ? (asked.items[at] === item ? 'right' : 'wrong') : 'idle';
          return (
            <Reorder.Item
              key={item}
              value={item}
              dragListener={!outcome}
              whileDrag={{ scale: 1.03, boxShadow: 'var(--shadow-pop)', zIndex: 2 }}
              transition={spring.snappy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 12,
                background: placed === 'right' ? 'var(--good-tint)' : placed === 'wrong' ? 'var(--bad-tint)' : 'var(--bg-sunken)',
                border: `1.5px solid ${placed === 'right' ? 'var(--good)' : placed === 'wrong' ? 'var(--bad)' : 'var(--line-default)'}`,
                fontSize: 15,
                fontWeight: 600,
                cursor: outcome ? 'default' : 'grab',
                position: 'relative',
              }}
            >
              <span className="tabular" style={{ width: 22, height: 22, borderRadius: 7, display: 'grid', placeItems: 'center', background: 'var(--bg-selected)', fontSize: 12 }}>
                {at + 1}
              </span>
              <span style={{ flex: 1 }}>{item}</span>
              <span aria-hidden="true" style={{ color: 'var(--text-faint)', letterSpacing: 1 }}>⋮⋮</span>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
      {!outcome && <CheckButton onClick={() => onAnswer(items.every((item, at) => item === asked.items[at]))} />}
      {outcome && !outcome.correct && (
        <p style={{ marginTop: 12, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          In order: {asked.items.map((item, at) => `${at + 1}. ${item}`).join('  ·  ')}
        </p>
      )}
    </div>
  );
}

function Match({
  asked,
  outcome,
  onAnswer,
}: {
  asked: Extract<Asked, { as: 'match' }>;
  outcome: Outcome | null;
  onAnswer: (correct: boolean) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});
  const lefts = asked.pairs.map(([leftSide]) => leftSide);
  const correct = useMemo(() => Object.fromEntries(asked.pairs), [asked.pairs]);
  const usedRight = new Set(Object.values(links));
  const complete = lefts.every((leftSide) => links[leftSide]);

  const pickRight = (rightSide: string) => {
    if (outcome || !chosen) return;
    setLinks((current) => {
      const next = { ...current };
      for (const [key, value] of Object.entries(next)) if (value === rightSide) delete next[key];
      next[chosen] = rightSide;
      return next;
    });
    const nextLeft = lefts.find((leftSide) => leftSide !== chosen && !links[leftSide]);
    setChosen(nextLeft ?? null);
  };

  return (
    <div>
      <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginBottom: 10 }}>
        Pick one on the left, then its match on the right.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          {lefts.map((leftSide) => {
            const state = outcome ? (links[leftSide] === correct[leftSide] ? 'right' : 'wrong') : 'idle';
            return (
              <motion.button
                key={leftSide}
                whileTap={{ scale: 0.97 }}
                onClick={() => !outcome && setChosen(leftSide)}
                style={{
                  padding: '11px 13px',
                  borderRadius: 12,
                  textAlign: 'start',
                  fontWeight: 650,
                  fontSize: 14,
                  background: state === 'right' ? 'var(--good-tint)' : state === 'wrong' ? 'var(--bad-tint)' : chosen === leftSide ? 'var(--bg-selected)' : 'var(--bg-sunken)',
                  border: `1.5px solid ${state === 'right' ? 'var(--good)' : state === 'wrong' ? 'var(--bad)' : chosen === leftSide ? 'var(--main-fill)' : 'var(--line-default)'}`,
                }}
              >
                {leftSide}
                <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', minHeight: 16 }}>
                  {links[leftSide] ? `→ ${links[leftSide]}` : ''}
                  {outcome && links[leftSide] !== correct[leftSide] ? `  (${correct[leftSide]})` : ''}
                </span>
              </motion.button>
            );
          })}
        </div>
        <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
          {asked.right.map((rightSide) => (
            <motion.button
              key={rightSide}
              whileTap={{ scale: 0.97 }}
              onClick={() => pickRight(rightSide)}
              disabled={Boolean(outcome)}
              animate={{ opacity: usedRight.has(rightSide) && !outcome ? 0.45 : 1 }}
              style={{
                padding: '11px 13px',
                borderRadius: 12,
                textAlign: 'start',
                fontWeight: 600,
                fontSize: 14,
                background: 'var(--bg-sunken)',
                border: '1.5px solid var(--line-default)',
              }}
            >
              {rightSide}
            </motion.button>
          ))}
        </div>
      </div>
      {!outcome && (
        <CheckButton
          disabled={!complete}
          onClick={() => onAnswer(lefts.every((leftSide) => links[leftSide] === correct[leftSide]))}
        />
      )}
    </div>
  );
}

function Fill({
  asked,
  outcome,
  onAnswer,
}: {
  asked: Extract<Asked, { as: 'fill' }>;
  outcome: Outcome | null;
  onAnswer: (correct: boolean) => void;
}) {
  const blanks = asked.parts.filter((part): part is { blank: string } => typeof part !== 'string');
  const [slots, setSlots] = useState<Array<string | null>>(blanks.map(() => null));
  const used = new Set(slots.filter(Boolean) as string[]);
  const place = (tile: string) => {
    if (outcome) return;
    const at = slots.findIndex((slot) => slot === null);
    if (at === -1) return;
    setSlots((current) => current.map((slot, index) => (index === at ? tile : slot)));
  };
  const clear = (at: number) => {
    if (outcome) return;
    setSlots((current) => current.map((slot, index) => (index === at ? null : slot)));
  };
  let blankIndex = -1;
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, lineHeight: 2 }}>
        {asked.parts.map((part, at) => {
          if (typeof part === 'string') return <span key={at}>{part}</span>;
          blankIndex += 1;
          const index = blankIndex;
          const filled = slots[index];
          const state = outcome ? (filled?.toLowerCase() === part.blank.toLowerCase() ? 'right' : 'wrong') : 'idle';
          return (
            <motion.button
              key={at}
              layout
              onClick={() => clear(index)}
              style={{
                display: 'inline-block',
                minWidth: 80,
                margin: '0 3px',
                padding: '0 10px',
                borderRadius: 8,
                font: 'inherit',
                lineHeight: 1.6,
                verticalAlign: 'baseline',
                background: state === 'right' ? 'var(--good-tint)' : state === 'wrong' ? 'var(--bad-tint)' : filled ? 'var(--bg-selected)' : 'transparent',
                border: `1.5px ${filled ? 'solid' : 'dashed'} ${state === 'right' ? 'var(--good)' : state === 'wrong' ? 'var(--bad)' : 'var(--line-strong)'}`,
                color: state === 'wrong' ? 'var(--bad)' : 'inherit',
              }}
            >
              {filled ?? ' '}
              {outcome && state === 'wrong' && <span style={{ color: 'var(--good)', fontSize: '0.8em' }}> {part.blank}</span>}
            </motion.button>
          );
        })}
      </p>
      {!outcome && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {asked.tiles.map((tile, at) => (
            <motion.button
              key={`${tile}-${at}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: used.has(tile) ? 0.3 : 1, y: 0 }}
              transition={{ ...spring.snappy, delay: at * 0.03 }}
              whileHover={used.has(tile) ? undefined : { y: -2 }}
              whileTap={{ scale: 0.95 }}
              disabled={used.has(tile)}
              onClick={() => place(tile)}
              style={{
                height: 38,
                padding: '0 14px',
                borderRadius: 10,
                background: 'var(--bg-sunken)',
                border: '1.5px solid var(--line-default)',
                fontFamily: 'var(--font-display)',
                fontSize: 17,
              }}
            >
              {tile}
            </motion.button>
          ))}
        </div>
      )}
      {!outcome && (
        <CheckButton
          disabled={slots.some((slot) => slot === null)}
          onClick={() =>
            onAnswer(slots.every((slot, index) => slot?.toLowerCase() === blanks[index].blank.toLowerCase()))
          }
        />
      )}
    </div>
  );
}

function CheckButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        marginTop: 16,
        height: 44,
        padding: '0 22px',
        borderRadius: 12,
        background: disabled ? 'var(--bg-selected)' : 'var(--main-fill)',
        color: disabled ? 'var(--text-faint)' : 'var(--main-on)',
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      Check
    </motion.button>
  );
}

function Feedback({
  asked,
  outcome,
  books,
  book,
  onNext,
  last,
}: {
  asked: Asked;
  outcome: Outcome;
  books: Book[];
  book: Book;
  onNext: () => void;
  last: boolean;
}) {
  const [verse, setVerse] = useState<string | null>(null);
  const at = parseRef(asked.question.r);
  const refBook = at ? books.find((candidate) => candidate.id === at.bookId) ?? book : book;

  useEffect(() => {
    if (!at || !refBook) return;
    let live = true;
    void loadChapter(refBook, at.chapter).then((verses) => {
      if (live) setVerse(verses.find((candidate) => candidate.number === at.verse)?.text ?? null);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked.question.r]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={transition('smooth')}
      style={{
        marginTop: 14,
        padding: '18px 22px',
        borderRadius: 16,
        background: outcome.correct ? 'color-mix(in srgb, var(--good) 9%, var(--bg-card))' : 'color-mix(in srgb, var(--bad) 8%, var(--bg-card))',
        border: `1px solid color-mix(in srgb, ${outcome.correct ? 'var(--good)' : 'var(--bad)'} 35%, transparent)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <motion.span
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={spring.bouncy}
          style={{ color: outcome.correct ? 'var(--good)' : 'var(--bad)', display: 'grid' }}
        >
          {outcome.correct ? <CheckIcon size={26} tint="var(--good)" /> : <CloseIcon size={26} />}
        </motion.span>
        <strong style={{ fontSize: 18 }}>
          {outcome.correct ? pick(['Correct!', 'Well done!', 'Exactly right.', 'Yes!']) : outcome.timedOut ? 'Out of time' : 'Not quite'}
        </strong>
        {outcome.correct && (
          <motion.span
            initial={{ opacity: 0, y: 10, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={spring.bouncy}
            className="tabular"
            style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--status-pending-text)', fontWeight: 800 }}
          >
            <BoltIcon size={16} tint="var(--warn)" />+{outcome.points}
          </motion.span>
        )}
        <span style={{ flex: 1 }} />
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onNext}
          autoFocus
          style={{
            height: 38,
            padding: '0 16px',
            borderRadius: 10,
            background: 'var(--main-fill)',
            color: 'var(--main-on)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {last ? 'See results' : 'Next'}
          <kbd className="kbd" style={{ background: 'transparent', borderColor: 'rgba(0,0,0,0.2)', color: 'inherit' }}>↵</kbd>
        </motion.button>
      </div>
      {!outcome.correct && asked.as === 'choice' && (
        <p style={{ marginTop: 10, fontSize: 14 }}>
          The answer is <strong style={{ color: 'var(--good)' }}>{asked.answer}</strong>.
        </p>
      )}
      {!outcome.correct && asked.as === 'tf' && (
        <p style={{ marginTop: 10, fontSize: 14 }}>
          That statement is <strong style={{ color: 'var(--good)' }}>{asked.answer ? 'true' : 'false'}</strong>.
        </p>
      )}
      {asked.question.x && <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{asked.question.x}</p>}
      {at && refBook && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-default)' }}>
          <span className="tabular" style={{ font: '650 12px var(--font-ui)', color: 'var(--text-tan)' }}>
            {refBook.name} {at.chapter}:{at.verse}
          </span>
          {verse && (
            <p style={{ marginTop: 4, fontFamily: 'var(--font-display)', fontSize: 16, lineHeight: 1.6 }}>{verse}</p>
          )}
        </div>
      )}
    </motion.div>
  );
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
