import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { books as loadBooks, chapter as loadChapter } from '../lib/bible';
import type { Book } from '../lib/bible';
import { useProgress } from '../lib/progress';
import { Icon } from '../components/Icon';
import { spring, transition } from '../lib/motion';
import type { ScreenId } from '../lib/screens';
import { SCREENS } from '../lib/screens';

/**
 * Verses for the verse of the day, held as references rather than text, so the words
 * come from the translation actually loaded and are never a second-hand quotation.
 */
const DAILY: Array<[book: string, chapter: number, verse: number]> = [
  ['John', 3, 16],
  ['Psalms', 23, 1],
  ['Proverbs', 3, 5],
  ['Isaiah', 40, 31],
  ['Joshua', 1, 9],
  ['Philippians', 4, 13],
  ['Romans', 8, 28],
  ['Jeremiah', 29, 11],
  ['Matthew', 11, 28],
  ['Psalms', 46, 1],
  ['Isaiah', 41, 10],
  ['2 Corinthians', 5, 17],
  ['Galatians', 2, 20],
  ['Hebrews', 11, 1],
  ['James', 1, 2],
  ['1 Peter', 5, 7],
  ['Psalms', 119, 105],
  ['Micah', 6, 8],
  ['Lamentations', 3, 22],
  ['Ephesians', 2, 8],
  ['Romans', 12, 2],
  ['Matthew', 6, 33],
  ['Psalms', 1, 1],
  ['Genesis', 1, 1],
  ['Revelation', 21, 4],
  ['1 John', 4, 19],
  ['Colossians', 3, 23],
  ['Deuteronomy', 31, 6],
  ['Psalms', 27, 1],
  ['Isaiah', 53, 5],
  ['Proverbs', 16, 3],
];

/** The same verse all day, changing with the date rather than at random. */
function todaysIndex() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const day = Math.floor((Date.now() - start.getTime()) / 86_400_000);
  return day % DAILY.length;
}

export function Portal({ go }: { go: (screen: ScreenId) => void }) {
  const { progress, streak } = useProgress();
  const [all, setAll] = useState<Book[]>([]);
  const [offset, setOffset] = useState(0);
  const [verse, setVerse] = useState<{ text: string; reference: string } | null>(null);

  useEffect(() => {
    loadBooks()
      .then(setAll)
      .catch(() => setAll([]));
  }, []);

  useEffect(() => {
    if (all.length === 0) return;
    const [name, chapterNumber, verseNumber] = DAILY[(todaysIndex() + offset) % DAILY.length];
    const book = all.find((candidate) => candidate.name === name);
    if (!book) return;

    loadChapter(book, chapterNumber)
      .then((verses) => {
        const found = verses.find((v) => v.number === verseNumber);
        if (found) {
          setVerse({ text: found.text, reference: `${name} ${chapterNumber}:${verseNumber}` });
        }
      })
      .catch(() => setVerse(null));
  }, [all, offset]);

  const totalChapters = all.reduce((sum, book) => sum + book.chapters, 0);
  const readCount = progress.read.length;
  const percent = totalChapters > 0 ? (readCount / totalChapters) * 100 : 0;
  const lastBook = progress.last ? all.find((b) => b.id === progress.last?.bookId) : undefined;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const circumference = 2 * Math.PI * 28;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition('smooth')}
      style={{ padding: '28px 32px 64px', maxWidth: 1160, margin: '0 auto' }}
    >
      <div
        style={{
          font: '600 11px var(--font-ui)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
        }}
      >
        {greeting}
      </div>
      <h1 style={{ fontSize: 34, marginTop: 4 }}>Where would you like to start?</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: 16,
          marginTop: 22,
        }}
      >
        <section
          aria-label="Verse of the day"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 30,
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--line-default)',
            background: 'linear-gradient(160deg, var(--bg-card), var(--bg-sunken))',
          }}
        >
          <div
            style={{
              font: '600 11px var(--font-ui)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
            }}
          >
            Verse of the day
          </div>
          <p
            className="selectable"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              lineHeight: 1.4,
              margin: '14px 0 18px',
              textWrap: 'pretty',
            }}
          >
            {verse ? verse.text : '…'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-tan)' }}>
              {verse ? `${verse.reference} · KJV` : ''}
            </span>
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={spring.snappy}
              onClick={() => setOffset((current) => current + 1)}
              style={{
                marginLeft: 'auto',
                padding: '8px 14px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--line-default)',
                fontWeight: 600,
              }}
            >
              Another verse
            </motion.button>
          </div>
        </section>

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Card>
            <div
              style={{
                font: '600 11px var(--font-ui)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
              }}
            >
              {lastBook ? 'Continue reading' : 'Start reading'}
            </div>
            <div style={{ fontSize: 20, fontWeight: 650, margin: '8px 0 2px' }}>
              {lastBook ? `${lastBook.name} ${progress.last?.chapter}` : 'Genesis 1'}
            </div>
            <span style={{ color: 'var(--text-secondary)' }}>
              {lastBook ? 'Pick up where you left off' : 'In the beginning'}
            </span>
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={spring.snappy}
              onClick={() => go('read')}
              style={{
                marginTop: 14,
                padding: '9px 16px',
                borderRadius: 'var(--radius-control)',
                background: 'var(--main-fill)',
                color: 'var(--main-on)',
                fontWeight: 600,
                justifySelf: 'start',
              }}
            >
              Open chapter
            </motion.button>
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="var(--bg-sunken)"
                  strokeWidth="7"
                />
                <motion.circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="var(--main-fill)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference * (1 - percent / 100) }}
                  transition={transition('smooth')}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                />
              </svg>
              <div>
                <b className="tabular" style={{ fontSize: 17 }}>
                  {readCount} of {totalChapters.toLocaleString()} chapters
                </b>
                <div style={{ color: 'var(--text-secondary)' }}>
                  {percent < 0.1 && readCount === 0
                    ? 'Nothing marked read yet'
                    : `${percent.toFixed(1)}% of the Bible`}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 12,
          marginTop: 16,
        }}
      >
        <Stat value={String(streak)} label={streak === 1 ? 'day streak' : 'day streak'} />
        <Stat value={String(progress.days.length)} label="days read" />
        <Stat
          value={`${(790892 - readWords(all, progress.read)).toLocaleString()}`}
          label="words to go"
        />
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 650, marginTop: 30, fontFamily: 'var(--font-ui)' }}>
        Go to
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
          marginTop: 12,
        }}
      >
        {SCREENS.filter((screen) => screen.id !== 'home').map((screen) => (
          <motion.button
            key={screen.id}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={spring.snappy}
            onClick={() => go(screen.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 10,
              padding: 16,
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--line-default)',
              background: 'var(--bg-card)',
              textAlign: 'left',
            }}
          >
            <span style={{ color: 'var(--text-tan)' }}>
              <Icon name={screen.icon} size={22} />
            </span>
            <span>
              <b style={{ display: 'block', fontWeight: 650 }}>{screen.label}</b>
              <span
                style={{
                  display: 'block',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {screen.blurb}
              </span>
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/** Words in the chapters marked read, estimated from each book's average chapter. */
function readWords(all: Book[], read: string[]): number {
  let total = 0;
  for (const key of read) {
    const bookId = Number(key.split(':')[0]);
    const book = all.find((candidate) => candidate.id === bookId);
    if (book && book.chapters > 0) total += book.words / book.chapters;
  }
  return Math.round(total);
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: 20,
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--line-default)',
        background: 'var(--bg-card)',
      }}
    >
      {children}
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--line-default)',
        background: 'var(--bg-card)',
      }}
    >
      <b className="tabular" style={{ display: 'block', fontSize: 24, fontWeight: 700 }}>
        {value}
      </b>
      <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{label}</span>
    </div>
  );
}
