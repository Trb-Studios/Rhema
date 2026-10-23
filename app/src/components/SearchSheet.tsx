import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MAX_HITS, around, search } from '../lib/search';
import type { Hit } from '../lib/search';
import type { EditionId } from '../lib/editions';
import { editionById } from '../lib/editions';
import { sheetVariants, transition } from '../lib/motion';
import { SearchIcon } from './Icons';

/**
 * Searching the whole Bible.
 *
 * Results come in as you type, after a short pause so a half-typed word does not send
 * the page hunting. The first search in an edition has to load its text, which the
 * sheet says plainly rather than sitting blank.
 */
export function SearchSheet({
  open,
  edition,
  onClose,
  onGo,
}: {
  open: boolean;
  edition: EditionId;
  onClose: () => void;
  onGo: (hit: Hit) => void;
}) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      input.current?.focus();
      input.current?.select();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setSearched(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void search(trimmed, edition, (busy) => !cancelled && setLoading(busy)).then((found) => {
        if (cancelled) return;
        setHits(found);
        setCursor(0);
        setSearched(true);
      });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, edition, open]);

  // Keep the highlighted result in view as the arrows move through the list.
  useEffect(() => {
    list.current?.querySelector('[data-at-cursor="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const title = useMemo(() => editionById(edition).title, [edition]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') onClose();
    if (hits.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((at) => (at + 1) % hits.length);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((at) => (at - 1 + hits.length) % hits.length);
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      onGo(hits[cursor]);
    }
  }

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
            background: 'rgba(23, 20, 15, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'grid',
            alignItems: 'start',
            justifyItems: 'center',
            paddingTop: '9vh',
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
            aria-label="Search the Bible"
            style={{
              width: 'min(760px, calc(100vw - 32px))',
              maxHeight: '74vh',
              display: 'grid',
              gridTemplateRows: 'auto minmax(0, 1fr) auto',
              background: 'var(--bg-card)',
              border: '1px solid var(--line-default)',
              borderRadius: 'var(--radius-panel)',
              boxShadow: 'var(--shadow-shell)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '16px 20px',
                borderBottom: '1px solid var(--line-default)',
                color: 'var(--text-secondary)',
              }}
            >
              <SearchIcon size={20} />
              <input
                ref={input}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${title}…`}
                aria-label="Search the Bible"
                style={{
                  flex: 1,
                  border: 0,
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 17,
                  outline: 'none',
                }}
              />
            </div>

            <div ref={list} style={{ overflowY: 'auto', padding: 8 }}>
              {loading && (
                <p style={{ padding: 20, color: 'var(--text-secondary)' }}>
                  Loading the text, one moment…
                </p>
              )}

              {!loading && searched && hits.length === 0 && (
                <p style={{ padding: 20, color: 'var(--text-secondary)' }}>
                  Nothing in {title} matches “{query.trim()}”.
                </p>
              )}

              {!loading &&
                hits.map((hit, index) => {
                  const [before, match, after] = around(hit);
                  const atCursor = index === cursor;
                  return (
                    <button
                      key={`${hit.bookId}:${hit.chapter}:${hit.verse}`}
                      data-at-cursor={atCursor}
                      onClick={() => onGo(hit)}
                      onMouseEnter={() => setCursor(index)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'start',
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: atCursor ? 'var(--bg-selected)' : 'transparent',
                      }}
                    >
                      <span
                        className="tabular"
                        style={{
                          font: '600 12px var(--font-ui)',
                          color: 'var(--text-tan)',
                        }}
                      >
                        {hit.book} {hit.chapter}:{hit.verse}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          marginTop: 3,
                          fontFamily: 'var(--font-display)',
                          fontSize: 15,
                          lineHeight: 1.5,
                        }}
                        dir={editionById(edition).direction}
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
                    </button>
                  );
                })}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 14,
                padding: '10px 20px',
                borderTop: '1px solid var(--line-default)',
                color: 'var(--text-faint)',
                fontSize: 12,
              }}
            >
              <span>↑↓ to move · Enter to open · Esc to close</span>
              <span style={{ marginLeft: 'auto' }} className="tabular">
                {hits.length >= MAX_HITS
                  ? `first ${MAX_HITS} matches`
                  : searched && !loading
                    ? `${hits.length} ${hits.length === 1 ? 'match' : 'matches'}`
                    : ''}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
