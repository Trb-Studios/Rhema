import { motion } from 'framer-motion';
import intros from '../data/book-intros.json';
import { transition } from '../lib/motion';
import { ScrollIcon } from './Icons';

const BY_NAME = new Map(intros.books.map((book) => [book.name, book]));

export function introFor(name: string) {
  return BY_NAME.get(name) ?? null;
}

/**
 * The page that opens a book: when, who, where, and what it is about.
 *
 * Where authorship or date is disputed, both the traditional ascription and the main
 * scholarly alternative are given. The point is to set a reader down in the right
 * century and country, not to settle arguments for them.
 */
export function BookIntro({ book, onRead }: { book: string; onRead: () => void }) {
  const intro = introFor(book);
  if (!intro) return null;

  const facts = [
    ['Time', intro.time],
    ['Author', intro.author],
    ['Place', intro.place],
  ] as const;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition('smooth')}
      style={{
        maxWidth: 'var(--reading-width)',
        margin: '0 auto 36px',
        padding: 26,
        borderRadius: 'var(--radius-panel)',
        background: 'var(--bg-card)',
        border: '1px solid var(--line-default)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--text-tan)',
          font: '600 11px var(--font-ui)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <ScrollIcon size={16} />
        About this book
      </div>

      <h2 style={{ fontSize: 26, marginTop: 10 }}>{intro.name}</h2>

      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0, 1fr)',
          gap: '8px 16px',
          margin: '16px 0 0',
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        {facts.map(([label, value]) => (
          <div key={label} style={{ display: 'contents' }}>
            <dt
              style={{
                color: 'var(--text-secondary)',
                font: '600 11px var(--font-ui)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                paddingTop: 2,
              }}
            >
              {label}
            </dt>
            <dd style={{ margin: 0 }}>{value}</dd>
          </div>
        ))}
      </dl>

      <p
        style={{
          marginTop: 18,
          paddingTop: 18,
          borderTop: '1px solid var(--line-default)',
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          lineHeight: 1.65,
        }}
      >
        {intro.background}
      </p>

      <button
        onClick={onRead}
        style={{
          marginTop: 18,
          padding: '9px 18px',
          borderRadius: 'var(--radius-control)',
          background: 'var(--main-fill)',
          color: 'var(--main-on)',
          fontWeight: 600,
        }}
      >
        Start reading
      </button>
    </motion.section>
  );
}
