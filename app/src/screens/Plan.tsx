import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { books as loadBooks } from '../lib/bible';
import type { Book } from '../lib/bible';
import { PRESETS, calculate, show } from '../lib/plan';
import { spring, transition } from '../lib/motion';

export function Plan() {
  const [all, setAll] = useState<Book[]>([]);
  const [mode, setMode] = useState<'days' | 'minutes'>('days');
  const [value, setValue] = useState(365);
  const [wpm, setWpm] = useState(200);

  useEffect(() => {
    loadBooks()
      .then(setAll)
      .catch(() => setAll([]));
  }, []);

  const totals = useMemo(
    () => ({
      words: all.reduce((sum, book) => sum + book.words, 0),
      chapters: all.reduce((sum, book) => sum + book.chapters, 0),
    }),
    [all],
  );

  const plan = useMemo(
    () =>
      calculate({
        mode,
        value,
        wordsPerMinute: wpm,
        totalWords: totals.words || 790_892,
        totalChapters: totals.chapters || 1189,
      }),
    [mode, value, wpm, totals],
  );

  const figures = [
    { value: show(plan.chaptersPerHour), label: 'chapters per hour' },
    { value: show(plan.chaptersPerDay), label: 'chapters per day' },
    { value: show(plan.minutesPerDay, 0), label: 'minutes per day' },
    { value: show(plan.chaptersPerWeek), label: 'chapters per week' },
    { value: show(plan.chaptersPerYear, 0), label: 'chapters per year' },
    {
      value: plan.finishesOn.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      label: `finish date · ${show(plan.days, 0)} days`,
    },
  ];

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
        Reading plan
      </div>
      <h1 style={{ fontSize: 34, marginTop: 4 }}>Do the maths, then just read</h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: 8, maxWidth: '62ch' }}>
        Set a finish date or a daily time. The plan schedules by words, so Psalm 119 counts for more
        than Psalm 117.
      </p>

      <div
        style={{
          marginTop: 20,
          padding: 24,
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--line-default)',
          background: 'var(--bg-card)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>I want to set</span>
            <select
              value={mode}
              onChange={(event) => {
                const next = event.target.value as 'days' | 'minutes';
                setMode(next);
                setValue(next === 'days' ? 365 : 30);
              }}
              style={field}
            >
              <option value="days">Days to finish</option>
              <option value="minutes">Minutes per day</option>
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              {mode === 'days' ? 'Days' : 'Minutes'}
            </span>
            <input
              type="number"
              min={1}
              value={value}
              onChange={(event) => setValue(Number(event.target.value))}
              style={field}
            />
          </label>
        </div>

        <label style={{ display: 'grid', gap: 6, marginTop: 14, maxWidth: 280 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Reading speed (words per minute)</span>
          <input
            type="number"
            min={50}
            max={600}
            value={wpm}
            onChange={(event) => setWpm(Number(event.target.value))}
            style={field}
          />
        </label>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
          {PRESETS.map((preset) => {
            const active = preset.mode === mode && preset.value === value;
            return (
              <motion.button
                key={preset.label}
                whileTap={{ scale: 0.97 }}
                transition={spring.snappy}
                onClick={() => {
                  setMode(preset.mode);
                  setValue(preset.value);
                }}
                aria-pressed={active}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  fontWeight: 600,
                  fontSize: 13,
                  background: active ? 'var(--main-fill)' : 'var(--bg-sunken)',
                  color: active ? 'var(--main-on)' : 'var(--text-secondary)',
                }}
              >
                {preset.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))',
          gap: 12,
          marginTop: 16,
        }}
      >
        {figures.map((figure) => (
          <div
            key={figure.label}
            style={{
              padding: 20,
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--line-default)',
              background: 'var(--bg-card)',
            }}
          >
            <b className="tabular" style={{ display: 'block', fontSize: 24, fontWeight: 700 }}>
              {figure.value}
            </b>
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{figure.label}</span>
          </div>
        ))}
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 18, maxWidth: '70ch' }}>
        Counted from the text loaded in the app: {totals.words.toLocaleString()} words across{' '}
        {totals.chapters.toLocaleString()} chapters of the King James Version. The whole Bible takes
        about {show(plan.totalHours, 0)} hours at {wpm} words a minute. Another translation will use
        its own counts.
      </p>
    </motion.div>
  );
}

const field: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--line-default)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
};
