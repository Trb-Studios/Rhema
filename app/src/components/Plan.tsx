import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Book } from '../lib/bible';
import { useProgress } from '../lib/progress';
import { usePlanSettings } from '../lib/planSettings';
import {
  buildDays,
  chaptersOf,
  describeRun,
  nextReading,
  readableDate,
  shapeOf,
  standing,
} from '../lib/schedule';
import type { Chapter } from '../lib/schedule';
import { sheetVariants, spring, transition } from '../lib/motion';
import { CalendarIcon, CheckIcon, CloseIcon, FlameIcon, TargetIcon } from './Icons';

type Props = {
  open: boolean;
  onClose: () => void;
  books: Book[];
  /** Opens a chapter in the reader and closes the plan. */
  onOpen: (bookId: number, chapter: number) => void;
};

const PACES = [
  { label: '90 days', mode: 'days' as const, value: 90 },
  { label: '6 months', mode: 'days' as const, value: 182 },
  { label: 'A year', mode: 'days' as const, value: 365 },
  { label: '2 years', mode: 'days' as const, value: 730 },
  { label: '15 min a day', mode: 'minutes' as const, value: 15 },
  { label: '30 min a day', mode: 'minutes' as const, value: 30 },
  { label: 'An hour a day', mode: 'minutes' as const, value: 60 },
];

/**
 * The reading plan.
 *
 * Built around one question — what do I read today? — because that is the question a
 * reader actually has. Everything else on the screen is there to answer "and am I
 * keeping up?", which is the only other one.
 *
 * Today's reading comes from the first chapter not yet read, not from the calendar. A
 * reader who misses a fortnight should come back to where they are rather than to a
 * backlog of fourteen days they will never face. Being behind is reported plainly, and
 * catching up is offered as a choice rather than imposed.
 */
export function Plan({ open, onClose, books, onOpen }: Props) {
  const { settings, started, start, update, stop } = usePlanSettings();
  const { isRead, markMany, streak } = useProgress();
  const [catchUp, setCatchUp] = useState(1);
  const [showDays, setShowDays] = useState(false);

  const chapters = useMemo(() => chaptersOf(books), [books]);
  const totalWords = useMemo(
    () => chapters.reduce((sum, chapter) => sum + chapter.words, 0),
    [chapters],
  );

  const read = (chapter: Chapter) => isRead(chapter.bookId, chapter.chapter);
  const shape = shapeOf(settings, totalWords);
  const where = standing(chapters, read, settings);
  const today = nextReading(chapters, read, shape.wordsPerDay, catchUp);
  const days = useMemo(
    () => (showDays ? buildDays(chapters, settings) : []),
    [showDays, chapters, settings],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const behind = Math.round(where.daysBehind);
  const minutes = today.reduce((sum, chapter) => sum + chapter.words, 0) / shape.wpm;

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
            aria-label="Reading plan"
            style={{
              width: 'min(680px, 100%)',
              maxHeight: 'min(760px, 92vh)',
              display: 'flex',
              flexDirection: 'column',
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
                gap: 9,
                padding: '14px 18px',
                flex: 'none',
                borderBottom: '1px solid var(--line-default)',
              }}
            >
              <span style={{ color: 'var(--text-tan)' }}>
                <CalendarIcon size={19} />
              </span>
              <h2 style={{ font: '650 15px var(--font-ui)', margin: 0 }}>Reading plan</h2>

              {streak > 0 && (
                <span
                  title={`${streak} days in a row`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    marginLeft: 4,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: 'var(--bg-sunken)',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <FlameIcon size={13} />
                  <span className="tabular">{streak}</span>
                </span>
              )}

              <button
                onClick={onClose}
                aria-label="Close the reading plan"
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

            <div style={{ overflowY: 'auto', padding: 18, display: 'grid', gap: 16 }}>
              {!started ? (
                <Starting onStart={(pace) => start(pace)} totalWords={totalWords} />
              ) : (
                <>
                  <Today
                    chapters={today}
                    minutes={minutes}
                    finished={where.finished}
                    catchUp={catchUp}
                    behind={behind}
                    onCatchUp={setCatchUp}
                    onOpen={(chapter) => {
                      onOpen(chapter.bookId, chapter.chapter);
                      onClose();
                    }}
                    onDone={() => {
                      markMany(today);
                      setCatchUp(1);
                    }}
                  />

                  <Standing where={where} behind={behind} shape={shape} />

                  <Pace
                    settings={settings}
                    shape={shape}
                    onPick={(pace) => {
                      update('mode', pace.mode);
                      update('value', pace.value);
                    }}
                    onSpeed={(wpm) => update('wordsPerMinute', wpm)}
                    onRestart={() => start({ mode: settings.mode, value: settings.value })}
                    onStop={stop}
                  />

                  <section>
                    <button
                      onClick={() => setShowDays(!showDays)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: 'var(--text-secondary)',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {showDays ? 'Hide the days ahead' : 'Show the days ahead'}
                    </button>

                    {showDays && <Days days={days} readOf={read} onOpen={onOpen} />}
                  </section>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Starting({
  onStart,
  totalWords,
}: {
  onStart: (pace: { mode: 'days' | 'minutes'; value: number }) => void;
  totalWords: number;
}) {
  const hours = Math.round(totalWords / 200 / 60);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-secondary)', margin: 0 }}>
        The whole Bible is {totalWords.toLocaleString()} words, about {hours} hours of reading.
        Choose a pace and the plan works out what to read each day — by length, not by chapter
        count, so a day of Psalms is not forty times a day of Chronicles.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {PACES.map((pace) => (
          <motion.button
            key={pace.label}
            whileTap={{ scale: 0.97 }}
            transition={spring.snappy}
            onClick={() => onStart(pace)}
            style={{
              padding: '9px 15px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--line-default)',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {pace.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function Today({
  chapters,
  minutes,
  finished,
  catchUp,
  behind,
  onCatchUp,
  onOpen,
  onDone,
}: {
  chapters: Chapter[];
  minutes: number;
  finished: boolean;
  catchUp: number;
  behind: number;
  onCatchUp: (value: number) => void;
  onOpen: (chapter: Chapter) => void;
  onDone: () => void;
}) {
  if (finished) {
    return (
      <div
        style={{
          padding: 22,
          borderRadius: 'var(--radius-panel)',
          background: 'var(--bg-sunken)',
          textAlign: 'center',
        }}
      >
        <span style={{ color: 'var(--main-fill)' }}>
          <CheckIcon size={30} />
        </span>
        <p style={{ margin: '10px 0 0', fontSize: 16, fontFamily: 'var(--font-display)' }}>
          Genesis to Revelation, finished.
        </p>
      </div>
    );
  }

  return (
    <section
      style={{
        padding: 18,
        borderRadius: 'var(--radius-panel)',
        background: 'var(--bg-sunken)',
        border: '1px solid var(--line-default)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          font: '600 11px var(--font-ui)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-tan)',
        }}
      >
        <span>{catchUp > 1 ? `Next ${catchUp} days` : 'Today'}</span>
      </div>

      <div
        style={{
          marginTop: 6,
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          lineHeight: 1.25,
        }}
      >
        {describeRun(chapters)}
      </div>

      <div style={{ marginTop: 5, color: 'var(--text-secondary)', fontSize: 13 }}>
        {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'} ·{' '}
        <span className="tabular">{Math.max(1, Math.round(minutes))}</span> min
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={spring.snappy}
          onClick={() => chapters[0] && onOpen(chapters[0])}
          disabled={chapters.length === 0}
          style={{
            padding: '9px 18px',
            borderRadius: 'var(--radius-control)',
            background: 'var(--main-fill)',
            color: 'var(--main-on)',
            fontWeight: 650,
            fontSize: 13,
          }}
        >
          Start reading
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={spring.snappy}
          onClick={onDone}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 15px',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--line-default)',
            fontWeight: 600,
            fontSize: 13,
            color: 'var(--text-secondary)',
          }}
        >
          <CheckIcon size={14} />
          Mark it read
        </motion.button>

        {behind >= 2 && (
          <select
            aria-label="How much to read"
            value={catchUp}
            onChange={(event) => onCatchUp(Number(event.target.value))}
            style={{
              padding: '9px 12px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--line-default)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <option value={1}>One day</option>
            <option value={2}>Two days</option>
            <option value={3}>Three days</option>
            <option value={7}>A week</option>
          </select>
        )}
      </div>
    </section>
  );
}

function Standing({
  where,
  behind,
  shape,
}: {
  where: ReturnType<typeof standing>;
  behind: number;
  shape: ReturnType<typeof shapeOf>;
}) {
  const percent = where.fraction * 100;
  const expected = where.expectedWords / where.totalWords;
  // Three chapters in is 0.25%, and "0% of the way through" reads as though nothing
  // counted. Below ten per cent it is worth a decimal place.
  const shown = percent > 0 && percent < 10 ? percent.toFixed(1) : String(Math.round(percent));

  return (
    <section>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 7,
        }}
      >
        <span style={{ fontWeight: 650, fontSize: 13 }}>
          <span className="tabular">{shown}%</span> of the way through
        </span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }} className="tabular">
          {where.chaptersRead} of {where.totalChapters} chapters
        </span>
      </div>

      {/* The bar carries two marks: how far the reader has come, and where the plan
          expected them to be by now. The gap between them is the whole story. */}
      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress through the Bible"
        style={{
          position: 'relative',
          height: 9,
          borderRadius: 999,
          background: 'var(--bg-sunken)',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(percent, percent > 0 ? 1.5 : 0)}%` }}
          transition={transition('smooth')}
          style={{ height: '100%', background: 'var(--main-fill)', borderRadius: 999 }}
        />
        {expected > 0.01 && expected < 0.99 && (
          <span
            aria-hidden="true"
            title="Where the plan expects you to be"
            style={{
              position: 'absolute',
              top: -2,
              bottom: -2,
              left: `${expected * 100}%`,
              width: 2,
              background: 'var(--text-faint)',
              opacity: 0.8,
            }}
          />
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px 14px',
          marginTop: 9,
          color: 'var(--text-secondary)',
          fontSize: 12.5,
        }}
      >
        <span>
          Day <span className="tabular">{where.dayIndex}</span> of{' '}
          <span className="tabular">{where.planDays}</span>
        </span>

        <span style={{ color: behind >= 2 ? 'var(--text-primary)' : undefined }}>
          {behind >= 2
            ? `${behind} days behind`
            : behind <= -2
              ? `${Math.abs(behind)} days ahead`
              : 'On pace'}
        </span>

        {where.finishesOn && !where.finished && (
          <span>At this rate, finished {readableDate(where.finishesOn)}</span>
        )}

        <span>
          <span className="tabular">{Math.round(shape.minutesPerDay)}</span> min a day to keep up
        </span>
      </div>
    </section>
  );
}

function Pace({
  settings,
  shape,
  onPick,
  onSpeed,
  onRestart,
  onStop,
}: {
  settings: ReturnType<typeof usePlanSettings>['settings'];
  shape: ReturnType<typeof shapeOf>;
  onPick: (pace: { mode: 'days' | 'minutes'; value: number }) => void;
  onSpeed: (wpm: number) => void;
  onRestart: () => void;
  onStop: () => void;
}) {
  const current = PACES.find(
    (pace) => pace.mode === settings.mode && pace.value === settings.value,
  );

  return (
    <section style={{ display: 'grid', gap: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ color: 'var(--text-tan)' }}>
          <TargetIcon size={15} />
        </span>
        <span style={{ fontWeight: 650, fontSize: 13 }}>Pace</span>
        <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>
          started {readableDate(settings.startedOn)}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {PACES.map((pace) => {
          const active = current === pace;
          return (
            <motion.button
              key={pace.label}
              whileTap={{ scale: 0.97 }}
              transition={spring.snappy}
              onClick={() => onPick(pace)}
              aria-pressed={active}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: `1px solid ${active ? 'var(--main-fill)' : 'var(--line-default)'}`,
                background: active ? 'var(--main-fill)' : 'transparent',
                color: active ? 'var(--main-on)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: 12.5,
              }}
            >
              {pace.label}
            </motion.button>
          );
        })}
      </div>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--text-secondary)',
          fontSize: 12.5,
        }}
      >
        Reading speed
        <input
          type="range"
          min={100}
          max={350}
          step={10}
          value={settings.wordsPerMinute}
          onChange={(event) => onSpeed(Number(event.target.value))}
          style={{ flex: 1, maxWidth: 190, accentColor: 'var(--main-fill)' }}
        />
        <span className="tabular" style={{ minWidth: 86 }}>
          {settings.wordsPerMinute} words/min
        </span>
      </label>

      <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>
        {shape.days.toLocaleString()} days · {(shape.wordsPerDay / 1000).toFixed(1)}k words a day ·{' '}
        {Math.round(shape.wordsPerDay / shape.wpm)} min
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 2 }}>
        <button
          onClick={onRestart}
          style={{ color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600 }}
        >
          Start again from today
        </button>
        <button
          onClick={onStop}
          style={{ color: 'var(--text-faint)', fontSize: 12.5, fontWeight: 600 }}
        >
          Choose a different plan
        </button>
      </div>
    </section>
  );
}

function Days({
  days,
  readOf,
  onOpen,
}: {
  days: ReturnType<typeof buildDays>;
  readOf: (chapter: Chapter) => boolean;
  onOpen: (bookId: number, chapter: number) => void;
}) {
  // The first day that still has something unread, so the list opens where the reader
  // is rather than at a month of days already done.
  const from = Math.max(
    0,
    days.findIndex((day) => day.chapters.some((chapter) => !readOf(chapter))),
  );
  const window = days.slice(from, from + 14);

  return (
    <div style={{ marginTop: 10, display: 'grid', gap: 2 }}>
      {window.map((day) => {
        const done = day.chapters.every(readOf);
        return (
          <button
            key={day.index}
            onClick={() => onOpen(day.chapters[0].bookId, day.chapters[0].chapter)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 10px',
              borderRadius: 8,
              textAlign: 'left',
              opacity: done ? 0.45 : 1,
            }}
          >
            <span
              className="tabular"
              style={{ width: 54, flex: 'none', color: 'var(--text-faint)', fontSize: 12 }}
            >
              {readableDate(day.date)}
            </span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: done ? 500 : 600 }}>
              {describeRun(day.chapters)}
            </span>
            {done ? (
              <span style={{ color: 'var(--main-fill)' }}>
                <CheckIcon size={14} />
              </span>
            ) : (
              <span className="tabular" style={{ color: 'var(--text-faint)', fontSize: 12 }}>
                {Math.max(1, Math.round(day.minutes))} min
              </span>
            )}
          </button>
        );
      })}
      <p style={{ color: 'var(--text-faint)', fontSize: 11.5, margin: '6px 0 0' }}>
        Every day is about the same amount of reading, so the number of chapters varies.
      </p>
    </div>
  );
}
