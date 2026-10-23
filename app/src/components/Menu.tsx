import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Book } from '../lib/bible';
import type { Progress } from '../lib/progress';
import { streakOf } from '../lib/progress';
import { useSettings } from '../lib/settings';
import { calculate, show } from '../lib/plan';
import { popoverVariants, spring, transition } from '../lib/motion';
import { About } from './About';
import { Backup } from './Backup';

/**
 * Everything that is not reading, behind one button: how far through you are, how long
 * the rest will take, and the handful of settings that change how the page reads.
 */
export function Menu({ books, progress }: { books: Book[]; progress: Progress }) {
  const [open, setOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const { settings, update } = useSettings();

  const totalChapters = books.reduce((sum, book) => sum + book.chapters, 0);
  const totalWords = books.reduce((sum, book) => sum + book.words, 0);
  const done = progress.read.length;
  const percent = totalChapters > 0 ? (done / totalChapters) * 100 : 0;

  // How long the chapters still unread would take at the current reading speed.
  const remaining = totalChapters > 0 ? 1 - done / totalChapters : 1;
  const atThirty = calculate({
    mode: 'minutes',
    value: 30,
    wordsPerMinute: 200,
    totalWords: Math.max(1, Math.round(totalWords * remaining)),
    totalChapters: Math.max(1, totalChapters - done),
  });

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.95 }}
        transition={spring.snappy}
        onClick={() => setOpen((value) => !value)}
        aria-label="Progress and settings"
        aria-expanded={open}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-secondary)',
          background: open ? 'var(--bg-selected)' : 'transparent',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 7h10 M18 7h2 M4 17h2 M10 17h10 M14 5v4 M6 15v4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 60 }}
              aria-hidden="true"
            />
            <motion.div
              variants={popoverVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition('snappy')}
              style={{
                position: 'fixed',
                top: 56,
                right: 12,
                zIndex: 61,
                width: 300,
                transformOrigin: 'top right',
                padding: 18,
                borderRadius: 'var(--radius-card)',
                background: 'var(--bg-card)',
                border: '1px solid var(--line-default)',
                boxShadow: 'var(--shadow-shell)',
              }}
            >
              <Label>Progress</Label>
              <div style={{ marginTop: 8 }}>
                <b className="tabular" style={{ fontSize: 20 }}>
                  {done} of {totalChapters.toLocaleString()}
                </b>
                <span style={{ color: 'var(--text-secondary)' }}> chapters</span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 99,
                  background: 'var(--bg-sunken)',
                  marginTop: 8,
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={transition('smooth')}
                  style={{ height: '100%', background: 'var(--main-fill)' }}
                />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 8 }}>
                {streakOf(progress.days)} day streak ·{' '}
                {done === totalChapters && totalChapters > 0
                  ? 'the whole Bible read'
                  : `about ${show(atThirty.days, 0)} days left at 30 minutes a day`}
              </p>

              <Divider />

              <Label>Reading</Label>
              <Setting label="Theme">
                <Segment
                  options={[
                    ['system', 'Auto'],
                    ['light', 'Light'],
                    ['dark', 'Dark'],
                  ]}
                  value={settings.theme}
                  onChange={(value) => update('theme', value as typeof settings.theme)}
                />
              </Setting>

              <Setting label="Text size">
                <input
                  type="range"
                  min={15}
                  max={26}
                  value={settings.size}
                  onChange={(event) => update('size', Number(event.target.value))}
                  aria-label="Text size"
                  style={{ width: 120, accentColor: 'var(--main-fill)' }}
                />
              </Setting>

              <Setting label="Column width">
                <input
                  type="range"
                  min={480}
                  max={780}
                  step={10}
                  value={settings.width}
                  onChange={(event) => update('width', Number(event.target.value))}
                  aria-label="Column width"
                  style={{ width: 120, accentColor: 'var(--main-fill)' }}
                />
              </Setting>

              <Setting label="Verse numbers">
                <input
                  type="checkbox"
                  checked={settings.verseNumbers}
                  onChange={(event) => update('verseNumbers', event.target.checked)}
                  aria-label="Verse numbers"
                  style={{ width: 18, height: 18, accentColor: 'var(--main-fill)' }}
                />
              </Setting>

              <Divider />

              <button
                onClick={() => setShowBackup((value) => !value)}
                aria-expanded={showBackup}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  font: '600 11px var(--font-ui)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                }}
              >
                Backup
                <span aria-hidden="true">{showBackup ? '−' : '+'}</span>
              </button>
              {showBackup && <Backup />}

              <Divider />

              <button
                onClick={() => setShowAbout((value) => !value)}
                aria-expanded={showAbout}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  font: '600 11px var(--font-ui)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                }}
              >
                Where the text comes from
                <span aria-hidden="true">{showAbout ? '−' : '+'}</span>
              </button>
              {showAbout && (
                <div style={{ marginTop: 12 }}>
                  <About />
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        font: '600 11px var(--font-ui)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--line-default)', margin: '16px 0' }} />;
}

function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 12,
        fontSize: 13,
      }}
    >
      <span>{label}</span>
      {children}
    </div>
  );
}

function Segment({
  options,
  value,
  onChange,
}: {
  options: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 3,
        borderRadius: 9,
        background: 'var(--bg-sunken)',
      }}
    >
      {options.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 12,
            background: value === key ? 'var(--bg-card)' : 'transparent',
            color: value === key ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
