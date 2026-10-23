import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Book } from '../lib/bible';
import { chapter as loadChapter } from '../lib/bible';
import { refsFor, referenceOf } from '../lib/crossrefs';
import type { Target } from '../lib/crossrefs';
import { transition } from '../lib/motion';

type Shown = { target: Target; reference: string; text: string };

/**
 * The verses that speak to this one.
 *
 * The text of each is fetched and shown, not just its reference. A list of addresses
 * would mean leaving the passage to look each one up, which is exactly the friction
 * that stops people following a cross-reference at all.
 */
export function CrossRefs({
  book,
  books,
  chapter,
  verse,
  onOpenVerse,
}: {
  book: Book;
  books: Book[];
  chapter: number;
  /** The verse selected in the reader, or null when none is. */
  verse: number | null;
  onOpenVerse: (bookId: number, chapter: number) => void;
}) {
  const [shown, setShown] = useState<Shown[] | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let current = true;
    setShown(null);
    setCount(0);

    if (verse === null) return;

    void (async () => {
      const refs = await refsFor(book.id);
      const targets = refs[`${chapter}:${verse}`] ?? [];
      if (!current) return;
      setCount(targets.length);

      const nameOf = (id: number) => books.find((item) => item.id === id)?.name ?? '';

      // Each reference's own words, fetched a chapter at a time and cached by the
      // reader underneath, so following several in one passage costs one fetch each.
      const out: Shown[] = [];
      for (const target of targets) {
        const [bookId, targetChapter, from, last] = target;
        const source = books.find((item) => item.id === bookId);
        if (!source) continue;

        const verses = await loadChapter(source, targetChapter);
        if (!current) return;

        const wanted = verses.filter(
          (item) => item.number >= from && item.number <= (last ?? from),
        );
        out.push({
          target,
          reference: referenceOf(target, nameOf),
          text: wanted.map((item) => item.text).join(' '),
        });
        setShown([...out]);
      }

      if (out.length === 0) setShown([]);
    })();

    return () => {
      current = false;
    };
  }, [book.id, books, chapter, verse]);

  if (verse === null) {
    return (
      <Empty>
        Choose a verse and the places Scripture says the same thing appear here, strongest first.
      </Empty>
    );
  }

  if (shown === null && count === 0) return <Empty>Looking…</Empty>;
  if (shown !== null && shown.length === 0) {
    return (
      <Empty>
        Nothing points at {book.name} {chapter}:{verse}. About one verse in twenty has no reference
        of its own.
      </Empty>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', marginTop: 14, display: 'grid', gap: 2 }}>
      <div
        style={{
          font: '600 11px var(--font-ui)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          marginBottom: 6,
        }}
      >
        {book.name} {chapter}:{verse}
      </div>

      {(shown ?? []).map((item, index) => (
        <motion.button
          key={item.reference}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transition('smooth'), delay: Math.min(index * 0.03, 0.2) }}
          onClick={() => onOpenVerse(item.target[0], item.target[1])}
          style={{
            display: 'grid',
            gap: 4,
            padding: '10px 12px',
            borderRadius: 10,
            textAlign: 'left',
            border: '1px solid transparent',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.borderColor = 'var(--line-default)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <span style={{ fontWeight: 650, fontSize: 12.5, color: 'var(--text-tan)' }}>
            {item.reference}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              lineHeight: 1.6,
              color: 'var(--text-primary)',
            }}
          >
            {item.text}
          </span>
        </motion.button>
      ))}

      {shown !== null && shown.length < count && (
        <div style={{ color: 'var(--text-faint)', fontSize: 12, padding: '6px 12px' }}>
          Loading the rest…
        </div>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      <p style={{ margin: 0, maxWidth: '32ch' }}>{children}</p>
    </div>
  );
}
