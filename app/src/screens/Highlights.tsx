import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Book } from '../lib/bible';
import { books as loadBooks, chapter as loadChapter } from '../lib/bible';
import { HIGHLIGHTS, readKey, useHighlights } from '../lib/highlights';
import { usePhrases } from '../lib/phrases';
import { navigate } from '../lib/nav';
import { spring, transition } from '../lib/motion';
import { ScreenHeader } from '../components/ScreenHeader';
import { HighlightIcon, SearchIcon, TrashIcon } from '../components/Icons';

type Entry = {
  key: string;
  kind: 'phrase' | 'verse';
  bookId: number;
  chapter: number;
  verse: number;
  lastVerse: number;
  colour: number;
  text: string;
  remove: () => void;
};

const FAMILIES = [
  { id: 'red', label: 'Reds', from: 0 },
  { id: 'green', label: 'Greens', from: 10 },
  { id: 'blue', label: 'Blues', from: 20 },
] as const;

/**
 * Everything marked, in one place.
 *
 * Phrases and whole verses together, in Bible order, filterable by colour — since a
 * reader who uses green for promises wants to see every promise at once — and by the
 * words themselves.
 */
export function Highlights() {
  const [books, setBooks] = useState<Book[]>([]);
  const { phrases, remove: removePhrase } = usePhrases();
  const { marks, clear } = useHighlights();
  const [family, setFamily] = useState<(typeof FAMILIES)[number]['id'] | null>(null);
  const [colour, setColour] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [verseText, setVerseText] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadBooks()
      .then(setBooks)
      .catch(() => {});
  }, []);

  // Whole-verse marks store only where they are, so their words are fetched to show.
  useEffect(() => {
    if (books.length === 0) return;
    let live = true;
    const wanted = new Map<string, { bookId: number; chapter: number }>();
    for (const key of Object.keys(marks)) {
      const at = readKey(key);
      if (!at || verseText[key] !== undefined) continue;
      wanted.set(`${at.bookId}:${at.chapter}`, { bookId: at.bookId, chapter: at.chapter });
    }
    void (async () => {
      const found: Record<string, string> = {};
      for (const { bookId, chapter } of wanted.values()) {
        const book = books.find((candidate) => candidate.id === bookId);
        if (!book) continue;
        for (const verse of await loadChapter(book, chapter)) {
          found[`${bookId}:${chapter}:${verse.number}`] = verse.text;
        }
      }
      if (live && Object.keys(found).length) setVerseText((current) => ({ ...current, ...found }));
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, marks]);

  const entries: Entry[] = useMemo(() => {
    const out: Entry[] = [];
    for (const phrase of phrases) {
      out.push({
        key: `p-${phrase.id}`,
        kind: 'phrase',
        bookId: phrase.bookId,
        chapter: phrase.chapter,
        verse: phrase.from.verse,
        lastVerse: phrase.to.verse,
        colour: phrase.colour,
        text: phrase.text,
        remove: () => removePhrase(phrase.id),
      });
    }
    for (const [key, index] of Object.entries(marks)) {
      const at = readKey(key);
      if (!at) continue;
      out.push({
        key: `v-${key}`,
        kind: 'verse',
        bookId: at.bookId,
        chapter: at.chapter,
        verse: at.verse,
        lastVerse: at.verse,
        colour: index,
        text: verseText[key] ?? '',
        remove: () => clear(at.bookId, at.chapter, at.verse),
      });
    }
    return out.sort(
      (a, b) => a.bookId - b.bookId || a.chapter - b.chapter || a.verse - b.verse,
    );
  }, [phrases, marks, verseText, removePhrase, clear]);

  const shown = entries.filter((entry) => {
    if (colour !== null && entry.colour !== colour) return false;
    if (family) {
      const from = FAMILIES.find((candidate) => candidate.id === family)!.from;
      if (entry.colour < from || entry.colour >= from + 10) return false;
    }
    if (query.trim() && !entry.text.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  const byBook = new Map<number, Entry[]>();
  for (const entry of shown) {
    const list = byBook.get(entry.bookId) ?? [];
    list.push(entry);
    byBook.set(entry.bookId, list);
  }

  const used = new Set(entries.map((entry) => entry.colour));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <ScreenHeader icon={<HighlightIcon size={15} />} crumbs={['Highlights']} />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '30px clamp(16px, 4vw, 40px) 64px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 34 }}>Highlights</h1>
            <span className="tabular" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {entries.length} marked · {phrases.length} phrases · {Object.keys(marks).length} whole verses
            </span>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            <Chip active={!family && colour === null} onClick={() => { setFamily(null); setColour(null); }}>
              All colours
            </Chip>
            {FAMILIES.map((entry) => (
              <Chip
                key={entry.id}
                active={family === entry.id}
                onClick={() => {
                  setFamily(family === entry.id ? null : entry.id);
                  setColour(null);
                }}
                dot={HIGHLIGHTS[entry.from + 5].colour}
              >
                {entry.label}
              </Chip>
            ))}
            <span style={{ flex: 1 }} />
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 32,
                padding: '0 10px',
                borderRadius: 8,
                background: 'var(--bg-sunken)',
                border: '1px solid var(--line-default)',
                color: 'var(--text-faint)',
                minWidth: 220,
              }}
            >
              <SearchIcon size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find in your highlights"
                style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text-primary)' }}
              />
            </label>
          </div>

          {/* Every colour, with the ones in use stronger */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30, 1fr)', gap: 4, marginTop: 14 }}>
            {HIGHLIGHTS.map((highlight) => (
              <motion.button
                key={highlight.index}
                whileHover={{ y: -2, scale: 1.15 }}
                transition={spring.snappy}
                onClick={() => {
                  setColour(colour === highlight.index ? null : highlight.index);
                  setFamily(null);
                }}
                title={highlight.name}
                aria-label={`Only ${highlight.name}`}
                style={{
                  height: 14,
                  borderRadius: 4,
                  background: highlight.colour,
                  opacity: used.has(highlight.index) ? 1 : 0.25,
                  boxShadow:
                    colour === highlight.index ? '0 0 0 2px var(--bg-page), 0 0 0 3.5px var(--text-primary)' : 'none',
                }}
              />
            ))}
          </div>

          {shown.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: 70, textAlign: 'center', color: 'var(--text-secondary)' }}
            >
              <span style={{ display: 'inline-grid', color: 'var(--text-tan)' }}>
                <HighlightIcon size={34} />
              </span>
              <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6 }}>
                {entries.length === 0
                  ? 'Select any words while reading and pick a colour. They gather here.'
                  : 'Nothing marked matches that.'}
              </p>
            </motion.div>
          ) : (
            [...byBook.entries()].map(([bookId, list], groupIndex) => {
              const book = books.find((candidate) => candidate.id === bookId);
              return (
                <section key={bookId} style={{ marginTop: 30 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                    <h2 style={{ fontSize: 22 }}>{book?.name ?? `Book ${bookId}`}</h2>
                    <span className="tabular" style={{ color: 'var(--text-faint)', fontSize: 12.5 }}>
                      {list.length}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <AnimatePresence initial={false}>
                      {list.map((entry, index) => (
                        <motion.div
                          key={entry.key}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20, height: 0, marginBottom: -8 }}
                          transition={{ ...transition('smooth'), delay: Math.min(groupIndex * 0.04 + index * 0.025, 0.5) }}
                          className="highlight-row"
                          style={{
                            position: 'relative',
                            display: 'flex',
                            gap: 14,
                            padding: '14px 16px',
                            borderRadius: 12,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--line-default)',
                            overflow: 'hidden',
                          }}
                        >
                          <span
                            style={{
                              width: 4,
                              flex: 'none',
                              borderRadius: 4,
                              background: HIGHLIGHTS[entry.colour]?.colour,
                            }}
                          />
                          <button
                            onClick={() =>
                              navigate({ screen: 'read', bookId: entry.bookId, chapter: entry.chapter, verse: entry.verse })
                            }
                            style={{ flex: 1, minWidth: 0, textAlign: 'start' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className="tabular" style={{ font: '600 12.5px var(--font-ui)', color: 'var(--text-tan)' }}>
                                {book?.name} {entry.chapter}:{entry.verse}
                                {entry.lastVerse !== entry.verse ? `–${entry.lastVerse}` : ''}
                              </span>
                              <span
                                style={{
                                  font: '600 10px var(--font-ui)',
                                  letterSpacing: '0.06em',
                                  textTransform: 'uppercase',
                                  color: 'var(--text-faint)',
                                }}
                              >
                                {entry.kind === 'phrase' ? 'Phrase' : 'Verse'} · {HIGHLIGHTS[entry.colour]?.name}
                              </span>
                            </div>
                            <p
                              style={{
                                marginTop: 6,
                                fontFamily: 'var(--font-display)',
                                fontSize: 16.5,
                                lineHeight: 1.55,
                                color: entry.text ? 'var(--text-primary)' : 'var(--text-faint)',
                              }}
                            >
                              <span
                                style={{
                                  backgroundImage: `linear-gradient(color-mix(in srgb, ${HIGHLIGHTS[entry.colour]?.colour} 30%, transparent), color-mix(in srgb, ${HIGHLIGHTS[entry.colour]?.colour} 30%, transparent))`,
                                  boxDecorationBreak: 'clone',
                                  WebkitBoxDecorationBreak: 'clone',
                                  borderRadius: 3,
                                }}
                              >
                                {entry.text ? `“${entry.text}”` : 'Loading…'}
                              </span>
                            </p>
                          </button>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={entry.remove}
                            aria-label="Remove highlight"
                            className="row-hover"
                            style={{
                              alignSelf: 'flex-start',
                              width: 28,
                              height: 28,
                              borderRadius: 7,
                              display: 'grid',
                              placeItems: 'center',
                              color: 'var(--text-faint)',
                            }}
                          >
                            <TrashIcon size={15} />
                          </motion.button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  dot,
  children,
}: {
  active: boolean;
  onClick: () => void;
  dot?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={spring.snappy}
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        height: 30,
        padding: '0 12px',
        borderRadius: 99,
        fontSize: 12.5,
        fontWeight: 600,
        border: `1px solid ${active ? 'var(--line-strong)' : 'var(--line-default)'}`,
        background: active ? 'var(--bg-selected)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
    >
      {dot && <span style={{ width: 9, height: 9, borderRadius: 99, background: dot }} />}
      {children}
    </motion.button>
  );
}
