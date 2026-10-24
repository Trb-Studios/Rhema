import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Book } from '../lib/bible';
import { books as loadBooks } from '../lib/bible';
import type { Asked, Level, Question } from '../lib/quizbank';
import { LIVES, bankFor, booksWithBanks, buildRound, expectedCount } from '../lib/quizbank';
import { keyOf, useQuizScores } from '../lib/quizscores';
import type { Route } from '../lib/nav';
import { replaceRoute, useOpenPassage } from '../lib/nav';
import { useProgress } from '../lib/progress';
import { spring, transition } from '../lib/motion';
import { ScreenHeader } from '../components/ScreenHeader';
import { Play } from '../components/quiz/Play';
import type { RoundResult } from '../components/quiz/Play';
import { Flashcards } from '../components/quiz/Flashcards';
import { Results } from '../components/quiz/Results';
import {
  BoltIcon,
  CardsIcon,
  ClockIcon,
  HeartIcon,
  SparkleIcon,
  TargetIcon,
  TrophyIcon,
} from '../components/Icons';

type Phase = 'books' | 'book' | 'flash' | 'play' | 'results';

const LEVELS: Array<{ id: Level; name: string; tag: string; lines: string[]; tone: string }> = [
  {
    id: 'easy',
    name: 'Easy',
    tag: 'Learn it',
    lines: ['All multiple choice', 'No clock', 'Five lives'],
    tone: 'var(--good)',
  },
  {
    id: 'medium',
    name: 'Medium',
    tag: 'Know it',
    lines: ['One minute a question', 'Some answers typed', 'Three lives'],
    tone: 'var(--warn)',
  },
  {
    id: 'hard',
    name: 'Hard',
    tag: 'Master it',
    lines: ['Answers typed', 'Put in order, match, fill the verse', 'Three lives'],
    tone: 'var(--bad)',
  },
];

/**
 * The quiz: pick a book, study it as flashcards, then test it at one of three levels.
 */
export function QuizScreen({ route }: { route: Route }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [phase, setPhase] = useState<Phase>('books');
  const [book, setBook] = useState<Book | null>(null);
  const [bank, setBank] = useState<Question[]>([]);
  const [level, setLevel] = useState<Level>('easy');
  const [length, setLength] = useState<'quick' | 'full'>('quick');
  const [round, setRound] = useState<Asked[]>([]);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [isBest, setIsBest] = useState(false);
  const { scores, record, starsOf } = useQuizScores();
  const { progress } = useProgress();
  const available = useMemo(() => booksWithBanks(), []);

  useEffect(() => {
    void loadBooks()
      .then(setBooks)
      .catch(() => {});
  }, []);

  // Arriving from the reader's "Quiz me" opens that book directly.
  useEffect(() => {
    if (!route.quizBook || books.length === 0) return;
    const chosen = books.find((candidate) => candidate.id === route.quizBook);
    if (chosen) void open(chosen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.nonce, books.length]);

  async function open(chosen: Book) {
    setBook(chosen);
    setBank(await bankFor(chosen.id));
    setPhase('book');
    replaceRoute({ screen: 'quiz', quizBook: chosen.id });
  }

  function start(chosenLevel: Level) {
    setLevel(chosenLevel);
    const size = length === 'quick' ? Math.min(10, bank.length) : bank.length;
    setRound(buildRound(bank, chosenLevel, size, Date.now()));
    setPhase('play');
  }

  function finish(outcome: RoundResult) {
    if (!book) return;
    const accuracy = outcome.answered ? outcome.right / outcome.answered : 0;
    setIsBest(record(book.id, level, outcome.score, accuracy, outcome.finished));
    setResult(outcome);
    setPhase('results');
  }

  const crumbs: ReactNode[] = ['Quiz'];
  if (book && phase !== 'books') crumbs.push(book.name);
  if (phase === 'play') crumbs.push(LEVELS.find((entry) => entry.id === level)!.name);
  if (phase === 'flash') crumbs.push('Flashcards');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {phase !== 'play' && phase !== 'flash' && (
        <ScreenHeader
          icon={<TargetIcon size={15} />}
          crumbs={crumbs}
          actions={
            phase !== 'books' ? (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setPhase('books');
                  replaceRoute({ screen: 'quiz' });
                }}
                className="row-hover"
                style={{ height: 30, padding: '0 10px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}
              >
                All books
              </motion.button>
            ) : undefined
          }
        />
      )}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.14 } }}
            transition={transition('smooth')}
            style={{ height: '100%' }}
          >
            {phase === 'books' && (
              <BookGrid
                books={books}
                available={available}
                starsOf={starsOf}
                lastRead={progress.last?.bookId}
                onOpen={(chosen) => void open(chosen)}
              />
            )}
            {phase === 'book' && book && (
              <BookSetup
                book={book}
                bank={bank}
                length={length}
                onLength={setLength}
                scores={scores}
                onFlash={() => setPhase('flash')}
                onStart={start}
              />
            )}
            {phase === 'flash' && book && (
              <Flashcards book={book} books={books} bank={bank} onQuit={() => setPhase('book')} />
            )}
            {phase === 'play' && book && (
              <Play book={book} books={books} level={level} round={round} onFinish={finish} onQuit={() => setPhase('book')} />
            )}
            {phase === 'results' && book && result && (
              <Results
                book={book}
                books={books}
                level={level}
                result={result}
                best={scores[keyOf(book.id, level)]?.best ?? 0}
                isBest={isBest}
                onAgain={() => start(level)}
                onLevel={(next) => start(next)}
                onDone={() => setPhase('book')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function BookGrid({
  books,
  available,
  starsOf,
  lastRead,
  onOpen,
}: {
  books: Book[];
  available: Set<number>;
  starsOf: (bookId: number) => number;
  lastRead?: number;
  onOpen: (book: Book) => void;
}) {
  const sections: Array<[string, Book[]]> = [
    ['Old Testament', books.filter((book) => book.testament === 'OT')],
    ['New Testament', books.filter((book) => book.testament === 'NT')],
  ];
  const suggested = books.find((book) => book.id === lastRead && available.has(book.id));

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '34px clamp(16px, 4vw, 40px) 64px' }}>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '28px 30px',
            borderRadius: 22,
            border: '1px solid var(--line-default)',
            background:
              'radial-gradient(500px 220px at 90% 0%, var(--glow-a), transparent 70%), radial-gradient(420px 260px at 0% 100%, color-mix(in srgb, var(--violet) 16%, transparent), transparent 70%), var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="eyebrow">Quiz</span>
            <SparkleIcon size={13} title="Questions written with AI" />
          </div>
          <h1 style={{ fontSize: 40, marginTop: 6 }}>Know the book. Then prove it.</h1>
          <p style={{ marginTop: 8, maxWidth: '60ch', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Every book has its own questions on the story it tells, what it shows of God, and what is
            worth remembering. Study them as flashcards, then take them on at three levels.
          </p>
          {suggested && (
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.snappy}
              onClick={() => onOpen(suggested)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 18,
                height: 42,
                padding: '0 18px',
                borderRadius: 12,
                background: 'var(--main-fill)',
                color: 'var(--main-on)',
                fontWeight: 700,
              }}
            >
              <BoltIcon size={16} /> Quiz me on {suggested.name}
            </motion.button>
          )}
        </div>

        {sections.map(([title, list], sectionIndex) => (
          <section key={title} style={{ marginTop: 30 }}>
            <h2 style={{ fontSize: 22, marginBottom: 12 }}>{title}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {list.map((book, index) => {
                const ready = available.has(book.id);
                const stars = starsOf(book.id);
                return (
                  <motion.button
                    key={book.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...transition('smooth'), delay: Math.min(0.5, sectionIndex * 0.08 + index * 0.012) }}
                    whileHover={ready ? { y: -3 } : undefined}
                    whileTap={ready ? { scale: 0.97 } : undefined}
                    onClick={() => ready && onOpen(book)}
                    disabled={!ready}
                    style={{
                      position: 'relative',
                      textAlign: 'start',
                      padding: '14px 14px 12px',
                      borderRadius: 14,
                      border: '1px solid var(--line-default)',
                      background: 'var(--bg-card)',
                      opacity: ready ? 1 : 0.45,
                      minHeight: 92,
                    }}
                  >
                    <div style={{ font: '400 18px var(--font-display)' }}>{book.name}</div>
                    <div className="tabular" style={{ marginTop: 4, fontSize: 11.5, color: 'var(--text-faint)' }}>
                      {expectedCount(book.chapters)} questions
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 2 }}>
                      {[1, 2, 3].map((star) => (
                        <span key={star} style={{ fontSize: 14, color: star <= stars ? 'var(--ai-sparkle)' : 'var(--bg-selected)' }}>
                          ★
                        </span>
                      ))}
                      {!ready && <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-faint)' }}>Coming</span>}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function BookSetup({
  book,
  bank,
  length,
  onLength,
  scores,
  onFlash,
  onStart,
}: {
  book: Book;
  bank: Question[];
  length: 'quick' | 'full';
  onLength: (length: 'quick' | 'full') => void;
  scores: Record<string, { best: number; stars: number; plays: number }>;
  onFlash: () => void;
  onStart: (level: Level) => void;
}) {
  const open = useOpenPassage();
  const counts = {
    story: bank.filter((question) => question.f === 'story').length,
    god: bank.filter((question) => question.f === 'god').length,
    remember: bank.filter((question) => question.f === 'remember').length,
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '34px clamp(16px, 4vw, 40px) 64px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="eyebrow">Quiz</div>
            <h1 style={{ fontSize: 48, lineHeight: 1.05, marginTop: 4 }}>{book.name}</h1>
            <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 13, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span className="tabular">{bank.length} questions</span>
              <span>· {counts.story} on the story</span>
              <span>· {counts.god} on God</span>
              <span>· {counts.remember} worth remembering</span>
            </div>
          </div>
          <button
            onClick={() => open(book.id, 1)}
            style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-tan)' }}
          >
            Read {book.name} →
          </button>
        </div>

        {/* Study */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transition('smooth'), delay: 0.04 }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.985 }}
          onClick={onFlash}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            width: '100%',
            marginTop: 24,
            padding: '20px 22px',
            borderRadius: 18,
            textAlign: 'start',
            border: '1px solid var(--line-default)',
            background:
              'radial-gradient(400px 160px at 100% 0%, color-mix(in srgb, var(--violet) 18%, transparent), transparent 70%), var(--bg-card)',
          }}
        >
          <span style={{ width: 54, height: 54, borderRadius: 16, display: 'grid', placeItems: 'center', background: 'var(--violet-tint)', color: 'var(--violet)' }}>
            <CardsIcon size={28} tint="var(--violet)" />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', font: '400 24px var(--font-display)' }}>Flashcards</span>
            <span style={{ display: 'block', marginTop: 2, fontSize: 13.5, color: 'var(--text-secondary)' }}>
              Every question as a card. Turn it over, then keep it or see it again.
            </span>
          </span>
          <span style={{ fontWeight: 700, color: 'var(--violet)' }}>Study →</span>
        </motion.button>

        {/* Test */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 30 }}>
          <h2 style={{ fontSize: 22 }}>Quiz</h2>
          <span style={{ flex: 1 }} />
          <div style={{ display: 'flex', padding: 2, borderRadius: 9, background: 'var(--bg-sunken)', border: '1px solid var(--line-default)' }}>
            {(
              [
                ['quick', `Quick · ${Math.min(10, bank.length)}`],
                ['full', `Whole book · ${bank.length}`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => onLength(id)}
                aria-pressed={length === id}
                style={{
                  height: 28,
                  padding: '0 12px',
                  borderRadius: 7,
                  fontSize: 12.5,
                  fontWeight: 600,
                  background: length === id ? 'var(--bg-selected)' : 'transparent',
                  color: length === id ? 'var(--text-primary)' : 'var(--text-faint)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 14 }}>
          {LEVELS.map((entry, index) => {
            const record = scores[keyOf(book.id, entry.id)];
            return (
              <motion.button
                key={entry.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...transition('smooth'), delay: 0.08 + index * 0.06 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onStart(entry.id)}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  textAlign: 'start',
                  padding: '20px 20px 18px',
                  borderRadius: 18,
                  border: '1px solid var(--line-default)',
                  background: `radial-gradient(260px 140px at 100% 0%, color-mix(in srgb, ${entry.tone} 16%, transparent), transparent 70%), var(--bg-card)`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: entry.tone, boxShadow: `0 0 12px ${entry.tone}` }} />
                  <span className="eyebrow" style={{ color: entry.tone }}>
                    {entry.tag}
                  </span>
                </div>
                <div style={{ font: '400 30px var(--font-display)', marginTop: 8 }}>{entry.name}</div>
                <div style={{ display: 'grid', gap: 6, marginTop: 12 }}>
                  {entry.lines.map((line, lineIndex) => (
                    <span key={line} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                      {lineIndex === 0 ? <TargetIcon size={14} /> : lineIndex === 1 ? <ClockIcon size={14} /> : <HeartIcon size={14} />}
                      {lineIndex === 2 ? `${LIVES[entry.id]} lives` : line}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--line-default)' }}>
                  <span style={{ display: 'flex', gap: 1 }}>
                    {[1, 2, 3].map((star) => (
                      <span key={star} style={{ fontSize: 14, color: star <= (record?.stars ?? 0) ? 'var(--ai-sparkle)' : 'var(--bg-selected)' }}>
                        ★
                      </span>
                    ))}
                  </span>
                  <span className="tabular" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-faint)' }}>
                    <TrophyIcon size={13} />
                    {record ? record.best.toLocaleString() : 'Not played'}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
