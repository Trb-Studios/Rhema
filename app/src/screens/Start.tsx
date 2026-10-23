import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Book, Verse } from '../lib/bible';
import { books as loadBooks, chapter as loadChapter } from '../lib/bible';
import { verseForDate } from '../lib/daily';
import { grid, longestRun, monthLabels, tally } from '../lib/heatmap';
import type { Cell } from '../lib/heatmap';
import { today } from '../lib/dates';
import { useProgress, streakOf } from '../lib/progress';
import { useSaved } from '../lib/saved';
import { useReview } from '../lib/review';
import { usePlanSettings } from '../lib/planSettings';
import { chaptersOf, describeRun, nextReading, shapeOf, standing } from '../lib/schedule';
import { keyLabel } from '../lib/commands';
import { spring, transition } from '../lib/motion';
import {
  BookIcon,
  BookmarkIcon,
  CalendarIcon,
  FlameIcon,
  LayersIcon,
  ScrollIcon,
  SearchIcon,
  TargetIcon,
} from '../components/Icons';

/**
 * The page the app opens on.
 *
 * Opening straight into Genesis 1 answers the question "where was I" only if the answer
 * happens to be Genesis 1. Someone coming back after a fortnight wants three things at
 * once: something to read right now, the place they stopped, and an honest picture of
 * how the habit is actually going — including the fortnight they missed.
 *
 * So the page leads with a verse, puts the way back into the text one click away, and
 * shows the year as a grid rather than a number. Nothing here is a reward or a nudge:
 * the grid shows the gaps as plainly as the runs, because a streak counter that only
 * ever congratulates is not information.
 */
export function Start({ onRead, onOpen }: { onRead: () => void; onOpen: (what: Opening) => void }) {
  const { progress } = useProgress();
  const { saved } = useSaved();
  const { dueCount } = useReview();
  const { settings: plan, started: planStarted } = usePlanSettings();

  const [books, setBooks] = useState<Book[]>([]);
  const [daily, setDaily] = useState<{ verse: Verse; book: Book; chapter: number } | null>(null);

  useEffect(() => {
    let current = true;
    void loadBooks()
      .then(async (list) => {
        if (!current) return;
        setBooks(list);

        const reference = verseForDate();
        if (!reference) return;
        const [bookId, chapter, number] = reference;
        const book = list.find((candidate) => candidate.id === bookId);
        if (!book) return;

        // The words come through the ordinary reading path, so the verse of the day is
        // the same text as the chapter it sits in, in whichever edition ships.
        const verses = await loadChapter(book, chapter);
        const verse = verses.find((candidate) => candidate.number === number);
        if (current && verse) setDaily({ verse, book, chapter });
      })
      .catch(() => {
        // A start page without a verse is still a start page.
      });
    return () => {
      current = false;
    };
  }, []);

  const streak = useMemo(() => streakOf(progress.days), [progress.days]);
  // A full year, to match the heading; it scrolls sideways where it will not fit.
  const weeks = useMemo(() => grid(progress.days, 53), [progress.days]);
  const months = useMemo(() => monthLabels(weeks), [weeks]);
  const seen = useMemo(() => tally(weeks), [weeks]);
  const best = useMemo(() => longestRun(progress.days), [progress.days]);

  const chapters = useMemo(() => chaptersOf(books), [books]);
  const readSet = useMemo(() => new Set(progress.read), [progress.read]);
  const where = useMemo(
    () =>
      chapters.length === 0
        ? null
        : standing(chapters, (c) => readSet.has(`${c.bookId}:${c.chapter}`), plan),
    [chapters, readSet, plan],
  );
  const next = useMemo(() => {
    if (chapters.length === 0) return null;
    const totalWords = chapters.reduce((sum, chapter) => sum + chapter.words, 0);
    const { wordsPerDay } = shapeOf(plan, totalWords);
    const run = nextReading(chapters, (c) => readSet.has(`${c.bookId}:${c.chapter}`), wordsPerDay);
    return run.length === 0 ? null : { chapters: run, label: describeRun(run) };
  }, [chapters, readSet, plan]);

  const resume = progress.last
    ? books.find((candidate) => candidate.id === progress.last?.bookId)
    : undefined;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'var(--bg-page)',
        color: 'var(--text-primary)',
      }}
    >
      <div
        style={{
          maxWidth: 940,
          margin: '0 auto',
          padding: 'clamp(28px, 5vw, 56px) clamp(16px, 4vw, 32px) 64px',
          display: 'grid',
          gap: 22,
          // Without this a wide child — the year grid — stretches the page instead of
          // scrolling inside its own card.
          minWidth: 0,
        }}
      >
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition('smooth')}
        >
          <p
            style={{
              font: '600 12px var(--font-ui)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-faint)',
            }}
          >
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <h1 style={{ font: '400 clamp(28px, 4vw, 38px) var(--font-display)', marginTop: 4 }}>
            {greeting}
          </h1>
        </motion.header>

        <Card delay={0.04}>
          {daily ? (
            <>
              <Label icon={<ScrollIcon size={13} />}>Verse for today</Label>
              <p
                style={{
                  font: '400 clamp(19px, 2.4vw, 25px)/1.55 var(--font-display)',
                  margin: '12px 0 14px',
                  maxWidth: '54ch',
                }}
              >
                {daily.verse.text}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span
                  className="tabular"
                  style={{ font: '600 13px var(--font-ui)', color: 'var(--text-tan)' }}
                >
                  {daily.book.name} {daily.chapter}:{daily.verse.number}
                </span>
                <Action
                  onClick={() =>
                    onOpen({
                      bookId: daily.book.id,
                      chapter: daily.chapter,
                      verse: daily.verse.number,
                    })
                  }
                >
                  Read it in place
                </Action>
              </div>
            </>
          ) : (
            <>
              <Label icon={<ScrollIcon size={13} />}>Verse for today</Label>
              <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 14 }}>
                Loading the day's verse…
              </p>
            </>
          )}
        </Card>

        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(270px, 100%), 1fr))',
            minWidth: 0,
          }}
        >
          <Card delay={0.08}>
            <Label icon={<BookIcon size={13} />}>Where you stopped</Label>
            {resume && progress.last ? (
              <>
                <p style={{ font: '400 22px var(--font-display)', margin: '10px 0 3px' }}>
                  {resume.name} {progress.last.chapter}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {where
                    ? `${where.chaptersRead.toLocaleString()} of ${where.totalChapters.toLocaleString()} chapters read`
                    : ''}
                </p>
                <Action primary onClick={onRead} style={{ marginTop: 14 }}>
                  Keep reading
                </Action>
              </>
            ) : (
              <>
                <p style={{ font: '400 22px var(--font-display)', margin: '10px 0 3px' }}>
                  Genesis 1
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Nothing read yet. The beginning is as good a place as any.
                </p>
                <Action primary onClick={onRead} style={{ marginTop: 14 }}>
                  Start reading
                </Action>
              </>
            )}
          </Card>

          <Card delay={0.12}>
            <Label icon={<TargetIcon size={13} />}>Today's reading</Label>
            {next && next.chapters.length > 0 ? (
              <>
                <p style={{ font: '400 22px var(--font-display)', margin: '10px 0 3px' }}>
                  {next.label}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {!planStarted
                    ? 'About a day at the usual pace. Start a plan to track it.'
                    : where && where.daysBehind > 0
                      ? `${where.daysBehind} ${where.daysBehind === 1 ? 'day' : 'days'} behind the plan`
                      : where && where.daysBehind < 0
                        ? `${-where.daysBehind} ${-where.daysBehind === 1 ? 'day' : 'days'} ahead`
                        : 'On pace'}
                </p>
                <Action
                  onClick={() =>
                    onOpen({
                      bookId: next.chapters[0].bookId,
                      chapter: next.chapters[0].chapter,
                    })
                  }
                  style={{ marginTop: 14 }}
                >
                  Open it
                </Action>
              </>
            ) : (
              <p
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                }}
              >
                {where?.finished
                  ? 'Every chapter read. Genesis to Revelation.'
                  : 'Working out the day’s reading…'}
              </p>
            )}
          </Card>
        </div>

        <Card delay={0.16}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <Label icon={<FlameIcon size={13} />}>The year so far</Label>
            <span
              style={{ marginInlineStart: 'auto', fontSize: 12.5, color: 'var(--text-secondary)' }}
            >
              <strong className="tabular" style={{ color: 'var(--text-primary)' }}>
                {streak}
              </strong>{' '}
              day {streak === 1 ? 'streak' : 'streak'} · best{' '}
              <strong className="tabular" style={{ color: 'var(--text-primary)' }}>
                {best}
              </strong>{' '}
              · read on {seen.read} of {seen.possible} days
            </span>
          </div>
          <Heatmap weeks={weeks} months={months} />
        </Card>

        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
            minWidth: 0,
          }}
        >
          <Tile
            icon={<LayersIcon size={16} />}
            label="Due for review"
            value={dueCount}
            hint={dueCount === 0 ? 'Nothing due' : dueCount === 1 ? 'card' : 'cards'}
            onClick={() => onOpen({ open: 'review' })}
          />
          <Tile
            icon={<BookmarkIcon size={16} />}
            label="Saved verses"
            value={saved.length}
            hint={saved.length === 1 ? 'verse' : 'verses'}
            onClick={() => onOpen({ open: 'library' })}
          />
          <Tile
            icon={<CalendarIcon size={16} />}
            label="Of the Bible"
            value={where ? `${Math.round(where.fraction * 100)}%` : '—'}
            hint="read"
            onClick={() => onOpen({ open: 'plan' })}
          />
          <Tile
            icon={<SearchIcon size={16} />}
            label="Search"
            value={keyLabel('Mod+K')}
            hint="anything"
            onClick={() => onOpen({ open: 'palette' })}
          />
        </div>
      </div>
    </div>
  );
}

/** What the start page asks the reader to be taken to. */
export type Opening =
  | { bookId: number; chapter: number; verse?: number }
  | { open: 'review' | 'library' | 'plan' | 'palette' };

function Heatmap({
  weeks,
  months,
}: {
  weeks: Cell[][];
  months: Array<{ index: number; label: string }>;
}) {
  const now = today();
  const gap = 3;
  const box = 11;

  // Where it will not all fit, the weeks worth looking at are the recent ones, so the
  // grid opens at its right-hand end rather than a year ago.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, [weeks.length]);

  return (
    <div ref={scroller} style={{ marginTop: 14, overflowX: 'auto', paddingBottom: 2 }}>
      <div style={{ display: 'inline-grid', gap, gridAutoFlow: 'column' }}>
        {/* The month names sit in their own row above the first cell of the week. */}
        <div
          style={{
            gridRow: 1,
            gridColumn: `1 / span ${weeks.length}`,
            display: 'grid',
            gridTemplateColumns: `repeat(${weeks.length}, ${box}px)`,
            gap,
            height: 14,
          }}
        >
          {weeks.map((_, index) => {
            const label = months.find((month) => month.index === index);
            return (
              <span
                key={index}
                style={{
                  font: '600 10px var(--font-ui)',
                  color: 'var(--text-faint)',
                  whiteSpace: 'nowrap',
                }}
              >
                {label?.label ?? ''}
              </span>
            );
          })}
        </div>

        {weeks.map((week, index) => (
          <div
            key={index}
            style={{ gridRow: 2, display: 'grid', gap, gridTemplateRows: `repeat(7, ${box}px)` }}
          >
            {week.map((cell) => (
              <motion.span
                key={cell.date}
                title={`${new Date(`${cell.date}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}${cell.ahead ? '' : cell.read ? ' — read' : ' — nothing read'}`}
                whileHover={cell.ahead ? undefined : { scale: 1.25 }}
                transition={spring.snappy}
                style={{
                  width: box,
                  height: box,
                  borderRadius: 3,
                  background: cell.ahead
                    ? 'transparent'
                    : cell.read
                      ? 'var(--main-fill)'
                      : 'var(--bg-sunken)',
                  boxShadow:
                    cell.date === now
                      ? 'inset 0 0 0 1.5px var(--text-primary)'
                      : cell.ahead
                        ? 'inset 0 0 0 1px var(--line-default)'
                        : 'none',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transition('smooth'), delay }}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--line-default)',
        borderRadius: 'var(--radius-card)',
        padding: '18px 20px 20px',
        minWidth: 0,
      }}
    >
      {children}
    </motion.section>
  );
}

function Label({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        font: '600 11px var(--font-ui)',
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
      }}
    >
      {icon}
      {children}
    </span>
  );
}

function Action({
  children,
  onClick,
  primary,
  style,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={spring.snappy}
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 'var(--radius-control)',
        font: '600 13px var(--font-ui)',
        background: primary ? 'var(--main-fill)' : 'var(--bg-sunken)',
        color: primary ? 'var(--main-on)' : 'var(--text-primary)',
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}

function Tile({
  icon,
  label,
  value,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={spring.snappy}
      onClick={onClick}
      style={{
        textAlign: 'start',
        padding: '14px 16px',
        borderRadius: 'var(--radius-card)',
        background: 'var(--bg-card)',
        border: '1px solid var(--line-default)',
        display: 'grid',
        gap: 2,
      }}
    >
      <span
        style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 7 }}
      >
        {icon}
        <span
          style={{
            font: '600 11px var(--font-ui)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      </span>
      <span className="tabular" style={{ font: '400 26px var(--font-display)', lineHeight: 1.2 }}>
        {value}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{hint}</span>
    </motion.button>
  );
}
