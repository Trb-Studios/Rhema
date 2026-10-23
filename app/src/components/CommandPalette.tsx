import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Command } from '../lib/commands';
import { keyLabel, matchBook, parseReference, rank } from '../lib/commands';
import type { Book } from '../lib/bible';
import { search } from '../lib/search';
import type { Hit } from '../lib/search';
import { around } from '../lib/search';
import type { EditionId } from '../lib/editions';
import { editionById } from '../lib/editions';
import { sheetVariants, transition } from '../lib/motion';
import { SearchIcon } from './Icons';

/**
 * One way in to everything.
 *
 * Typing a reference offers the passage, typing a few words offers the commands that
 * match, and anything else searches the text. The three are offered together rather
 * than behind a mode switch, because a reader who types "john 3" and a reader who types
 * "lamp unto my feet" both just want to get somewhere.
 */
export function CommandPalette({
  open,
  commands,
  books,
  edition,
  onClose,
  onGoTo,
  onGoToHit,
}: {
  open: boolean;
  commands: Command[];
  books: Book[];
  edition: EditionId;
  onClose: () => void;
  onGoTo: (book: Book, chapter: number, verse?: number) => void;
  onGoToHit: (hit: Hit) => void;
}) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    setHits([]);
    // Focused on the next frame, after the sheet is in the document.
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  /** A passage, when what was typed reads like one. */
  const passage = useMemo(() => {
    const reference = parseReference(query);
    if (!reference) return null;
    const book = matchBook(books, reference.book);
    if (!book) return null;

    const chapter = Math.min(Math.max(1, reference.chapter ?? 1), book.chapters);
    return { book, chapter, verse: reference.verse };
  }, [query, books]);

  const matching = useMemo(() => rank(commands, query).slice(0, 8), [commands, query]);

  // Searching the text takes a moment, so it runs behind the instant answers.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setHits([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void search(trimmed, edition, (busy) => !cancelled && setLoading(busy)).then((found) => {
        if (!cancelled) setHits(found.slice(0, 6));
      });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, edition, open]);

  /** Everything offered, in the order the arrows move through it. */
  const rows = useMemo(() => {
    const out: Array<
      | { kind: 'passage'; book: Book; chapter: number; verse?: number }
      | { kind: 'command'; command: Command }
      | { kind: 'hit'; hit: Hit }
    > = [];
    if (passage) out.push({ kind: 'passage', ...passage });
    for (const command of matching) out.push({ kind: 'command', command });
    for (const hit of hits) out.push({ kind: 'hit', hit });
    return out;
  }, [passage, matching, hits]);

  useEffect(() => {
    setCursor((at) => Math.min(at, Math.max(0, rows.length - 1)));
  }, [rows.length]);

  useEffect(() => {
    list.current?.querySelector('[data-at-cursor="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  function choose(index: number) {
    const row = rows[index];
    if (!row) return;
    if (row.kind === 'passage') onGoTo(row.book, row.chapter, row.verse);
    else if (row.kind === 'command') row.command.run();
    else onGoToHit(row.hit);
    onClose();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') return onClose();
    if (rows.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((at) => (at + 1) % rows.length);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((at) => (at - 1 + rows.length) % rows.length);
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      choose(cursor);
    }
  }

  let lastGroup = '';

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
            zIndex: 80,
            background: 'rgba(23, 20, 15, 0.42)',
            backdropFilter: 'blur(3px)',
            display: 'grid',
            alignItems: 'start',
            justifyItems: 'center',
            paddingTop: '11vh',
          }}
        >
          <motion.div
            variants={sheetVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition('smooth')}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={onKeyDown}
            role="dialog"
            aria-label="Command palette"
            style={{
              width: 'min(680px, calc(100vw - 32px))',
              maxHeight: '68vh',
              display: 'grid',
              gridTemplateRows: 'auto minmax(0, 1fr) auto',
              background: 'var(--bg-card)',
              border: '1px solid var(--line-default)',
              borderRadius: 16,
              boxShadow: 'var(--shadow-shell)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '15px 18px',
                borderBottom: '1px solid var(--line-default)',
                color: 'var(--text-secondary)',
              }}
            >
              <SearchIcon size={19} />
              <input
                ref={input}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCursor(0);
                }}
                placeholder="Go to a passage, search the text, or run a command…"
                aria-label="Go to a passage, search the text, or run a command"
                style={{
                  flex: 1,
                  border: 0,
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 16,
                  outline: 'none',
                }}
              />
              {loading && <span style={{ fontSize: 12 }}>searching…</span>}
            </div>

            <div ref={list} style={{ overflowY: 'auto', padding: 7 }}>
              {rows.length === 0 && (
                <p style={{ padding: 18, color: 'var(--text-secondary)', fontSize: 14 }}>
                  {query.trim()
                    ? `Nothing matches “${query.trim()}”.`
                    : 'Start typing a book, a phrase, or what you want to do.'}
                </p>
              )}

              {rows.map((row, index) => {
                const atCursor = index === cursor;
                const group =
                  row.kind === 'passage'
                    ? 'Passage'
                    : row.kind === 'command'
                      ? row.command.group
                      : 'In the text';
                const heading = group !== lastGroup ? group : null;
                lastGroup = group;

                return (
                  <div key={`${row.kind}-${index}`}>
                    {heading && (
                      <div
                        style={{
                          padding: '10px 11px 5px',
                          font: '600 10px var(--font-ui)',
                          letterSpacing: '0.09em',
                          textTransform: 'uppercase',
                          color: 'var(--text-faint)',
                        }}
                      >
                        {heading}
                      </div>
                    )}
                    <button
                      data-at-cursor={atCursor}
                      onClick={() => choose(index)}
                      onMouseMove={() => setCursor(index)}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 11,
                        width: '100%',
                        textAlign: 'start',
                        padding: '9px 11px',
                        borderRadius: 9,
                      }}
                    >
                      {atCursor && (
                        <motion.span
                          layoutId="palette-cursor"
                          transition={transition('snappy')}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: 9,
                            background: 'var(--bg-selected)',
                          }}
                        />
                      )}
                      <span
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 11,
                          width: '100%',
                          minWidth: 0,
                        }}
                      >
                        {row.kind === 'command' && row.command.icon && (
                          <span
                            style={{
                              color: row.command.on ? 'var(--text-tan)' : 'var(--text-secondary)',
                              display: 'flex',
                            }}
                          >
                            {row.command.icon}
                          </span>
                        )}

                        <span style={{ minWidth: 0, flex: 1 }}>
                          {row.kind === 'passage' && (
                            <>
                              <span style={{ fontWeight: 600 }}>
                                {row.book.name} {row.chapter}
                                {row.verse ? `:${row.verse}` : ''}
                              </span>
                              <span
                                style={{
                                  display: 'block',
                                  fontSize: 12,
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                Open the passage
                              </span>
                            </>
                          )}

                          {row.kind === 'command' && (
                            <>
                              <span style={{ fontWeight: 600 }}>{row.command.title}</span>
                              {row.command.hint && (
                                <span
                                  style={{
                                    display: 'block',
                                    fontSize: 12,
                                    color: 'var(--text-secondary)',
                                  }}
                                >
                                  {row.command.hint}
                                </span>
                              )}
                            </>
                          )}

                          {row.kind === 'hit' && <HitRow hit={row.hit} edition={edition} />}
                        </span>

                        {row.kind === 'command' && row.command.on && (
                          <span style={{ fontSize: 12, color: 'var(--text-tan)' }}>on</span>
                        )}
                        {row.kind === 'command' && row.command.shortcut && (
                          <kbd
                            style={{
                              font: '500 11px var(--font-ui)',
                              padding: '3px 7px',
                              borderRadius: 6,
                              border: '1px solid var(--line-default)',
                              background: 'var(--bg-sunken)',
                              color: 'var(--text-secondary)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {keyLabel(row.command.shortcut)}
                          </kbd>
                        )}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 16,
                padding: '9px 18px',
                borderTop: '1px solid var(--line-default)',
                color: 'var(--text-faint)',
                fontSize: 11.5,
              }}
            >
              <span>↑↓ move</span>
              <span>↵ open</span>
              <span>esc close</span>
              <span style={{ marginLeft: 'auto' }}>
                Try “john 3”, “lamp unto my feet”, or “plan”
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HitRow({ hit, edition }: { hit: Hit; edition: EditionId }) {
  const [before, match, after] = around(hit);
  return (
    <>
      <span className="tabular" style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-tan)' }}>
        {hit.book} {hit.chapter}:{hit.verse}
      </span>
      <span
        dir={editionById(edition).direction}
        style={{
          display: 'block',
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          lineHeight: 1.45,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {before}
        <mark
          style={{
            background: 'color-mix(in srgb, var(--main-fill) 55%, transparent)',
            color: 'inherit',
            borderRadius: 2,
          }}
        >
          {match}
        </mark>
        {after}
      </span>
    </>
  );
}
