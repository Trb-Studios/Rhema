import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Command } from '../lib/commands';
import {
  keyLabel,
  matchBook,
  parseReference,
  rank,
  useRegisteredCommands,
} from '../lib/commands';
import type { Book, Verse } from '../lib/bible';
import { books as loadBooks, chapter as loadChapter } from '../lib/bible';
import { search, around } from '../lib/search';
import type { Hit } from '../lib/search';
import { editionById } from '../lib/editions';
import type { EditionId } from '../lib/editions';
import type { Subject } from '../lib/marks';
import { allSubjects } from '../lib/marks';
import { descriptorOf, searchSubjects, withEverydayNames } from '../lib/people';
import { loadProfiles } from '../lib/profiles';
import { navigate, usePalette, useReaderEdition } from '../lib/nav';
import { copy as toClipboard } from '../lib/copy';
import { spring, transition } from '../lib/motion';
import {
  ArrowIcon,
  BookIcon,
  ChevronIcon,
  PersonIcon,
  PlaceIcon,
  ScrollIcon,
  SearchIcon,
} from './Icons';

type Scope = 'all' | 'passages' | 'people' | 'commands' | 'text';

const SCOPES: Array<[Scope, string]> = [
  ['all', 'Everything'],
  ['passages', 'Passages'],
  ['people', 'People & places'],
  ['text', 'Text only'],
  ['commands', 'Commands'],
];

type Row =
  | { kind: 'passage'; book: Book; chapter: number; verse?: number }
  | { kind: 'command'; command: Command }
  | { kind: 'subject'; subject: Subject; descriptor: string }
  | { kind: 'hit'; hit: Hit };

type Action = { label: string; shortcut?: string; run: () => void };

/**
 * One way in to everything, laid out like a launcher.
 *
 * The list is on the left and what the highlighted row leads to is previewed on the
 * right, so a reader can look before they leap: the verse a search found, the start of a
 * chapter, who a James is. The bar along the bottom names what Enter will do, and Ctrl K
 * inside the palette opens the other things that can be done with the row.
 */
export function CommandPalette({ globalCommands }: { globalCommands: Command[] }) {
  const [open, setOpen] = usePalette();
  const screenCommands = useRegisteredCommands();
  const edition = useReaderEdition();

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [scopeOpen, setScopeOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [subjects, setSubjects] = useState<Map<string, Subject> | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  // Cleared on the way out as well as on the way in: typing the instant the palette
  // reopens could otherwise land before the reset and be added to the last search.
  const close = () => {
    setOpen(false);
    setQuery('');
    setHits([]);
    setCursor(0);
  };

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    setHits([]);
    setActionsOpen(false);
    setScopeOpen(false);
    void loadBooks()
      .then(setBooks)
      .catch(() => {});
    void Promise.all([allSubjects(), loadProfiles()]).then(([found, profiles]) =>
      setSubjects(withEverydayNames(found, profiles)),
    );
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const commands = useMemo(
    () => [...screenCommands, ...globalCommands],
    [screenCommands, globalCommands],
  );

  const passage = useMemo(() => {
    if (scope !== 'all' && scope !== 'passages') return null;
    const reference = parseReference(query);
    if (!reference) return null;
    const book = matchBook(books, reference.book);
    if (!book) return null;
    const chapter = Math.min(Math.max(1, reference.chapter ?? 1), book.chapters);
    return { book, chapter, verse: reference.verse };
  }, [query, books, scope]);

  const matching = useMemo(
    () =>
      scope === 'all' || scope === 'commands'
        ? rank(commands, query).slice(0, scope === 'commands' ? 40 : query.trim() ? 6 : 10)
        : [],
    [commands, query, scope],
  );

  const people = useMemo(() => {
    if (!subjects || (scope !== 'all' && scope !== 'people')) return [];
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    return searchSubjects(subjects.values(), trimmed, undefined, scope === 'people' ? 40 : 5).map(
      (subject) => ({ subject, descriptor: descriptorOf(subject, subjects, books) }),
    );
  }, [subjects, query, scope, books]);

  // Searching the text takes a moment, so it runs behind the instant answers.
  useEffect(() => {
    if (!open || (scope !== 'all' && scope !== 'text')) {
      setHits([]);
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void search(trimmed, edition, (busy) => !cancelled && setLoading(busy)).then((found) => {
        if (!cancelled) setHits(found.slice(0, scope === 'text' ? 60 : 8));
      });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, edition, open, scope]);

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    if (passage) out.push({ kind: 'passage', ...passage });
    for (const command of matching) out.push({ kind: 'command', command });
    for (const entry of people) out.push({ kind: 'subject', ...entry });
    for (const hit of hits) out.push({ kind: 'hit', hit });
    return out;
  }, [passage, matching, people, hits]);

  useEffect(() => {
    setCursor((at) => Math.min(at, Math.max(0, rows.length - 1)));
  }, [rows.length]);

  useEffect(() => {
    list.current?.querySelector('[data-at-cursor="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  // Where the highlighted row sits in the list, for the highlight to slide to.
  const [highlight, setHighlight] = useState({ top: 0, height: 0 });
  useLayoutEffect(() => {
    const row = list.current?.querySelector<HTMLElement>('[data-at-cursor="true"]');
    setHighlight(row ? { top: row.offsetTop, height: row.offsetHeight } : { top: 0, height: 0 });
  }, [cursor, rows, open]);

  const current = rows[cursor];

  function actionsFor(row: Row | undefined): Action[] {
    if (!row) return [];
    if (row.kind === 'passage') {
      const label = `${row.book.name} ${row.chapter}${row.verse ? `:${row.verse}` : ''}`;
      return [
        {
          label: 'Open passage',
          run: () =>
            navigate({ screen: 'read', bookId: row.book.id, chapter: row.chapter, verse: row.verse }),
        },
        { label: 'Copy reference', shortcut: 'Mod+C', run: () => void toClipboard(label) },
      ];
    }
    if (row.kind === 'command') return [{ label: 'Run command', run: row.command.run }];
    if (row.kind === 'subject') {
      const first = row.subject.where[0];
      return [
        {
          label: 'Open profile',
          run: () =>
            navigate({
              screen: row.subject.kind === 'place' ? 'places' : 'people',
              subject: row.subject.id,
            }),
        },
        ...(first
          ? [
              {
                label: 'Read where first named',
                run: () =>
                  navigate({ screen: 'read', bookId: first[0], chapter: first[1], verse: first[2] }),
              },
            ]
          : []),
      ];
    }
    const hit = row.hit;
    return [
      {
        label: 'Open in place',
        run: () => navigate({ screen: 'read', bookId: hit.bookId, chapter: hit.chapter, verse: hit.verse }),
      },
      {
        label: 'Copy verse',
        shortcut: 'Mod+C',
        run: () => void toClipboard(`${hit.text} (${hit.book} ${hit.chapter}:${hit.verse})`),
      },
    ];
  }

  function run(action: Action | undefined) {
    if (!action) return;
    action.run();
    close();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (actionsOpen) setActionsOpen(false);
      else if (scopeOpen) setScopeOpen(false);
      else close();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      setActionsOpen((value) => !value);
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const index = SCOPES.findIndex(([id]) => id === scope);
      const next = SCOPES[(index + (event.shiftKey ? SCOPES.length - 1 : 1)) % SCOPES.length];
      setScope(next[0]);
      setCursor(0);
      return;
    }
    if (actionsOpen) return;
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
      run(actionsFor(current)[0]);
    }
  }

  const primary = actionsFor(current)[0];
  let lastGroup = '';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'var(--scrim)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            alignItems: 'start',
            justifyItems: 'center',
            paddingTop: '9vh',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={transition('smooth')}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={onKeyDown}
            role="dialog"
            aria-label="Command palette"
            className="glass"
            style={{
              position: 'relative',
              width: 'min(860px, calc(100vw - 32px))',
              height: 'min(540px, 76vh)',
              display: 'grid',
              gridTemplateRows: 'auto minmax(0, 1fr) auto',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {/* The glow behind the frame: what makes it read as a launcher. */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background:
                  'radial-gradient(600px 260px at 85% 0%, var(--glow-a), transparent 70%), radial-gradient(500px 300px at 0% 100%, var(--glow-b), transparent 70%)',
              }}
            />

            {/* Search bar */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0 12px 0 18px',
                height: 56,
                borderBottom: '1px solid var(--glass-border)',
              }}
            >
              <span style={{ color: 'var(--text-faint)', display: 'grid' }}>
                <SearchIcon size={18} />
              </span>
              <input
                ref={input}
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCursor(0);
                }}
                placeholder="Search passages, people, the text, or commands…"
                aria-label="Search passages, people, the text, or commands"
                style={{
                  flex: 1,
                  border: 0,
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 17,
                  outline: 'none',
                }}
              />
              {loading && <Spinner />}
              <div style={{ position: 'relative' }}>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  transition={spring.snappy}
                  onClick={() => setScopeOpen((value) => !value)}
                  aria-haspopup="listbox"
                  aria-expanded={scopeOpen}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 32,
                    padding: '0 10px 0 12px',
                    borderRadius: 8,
                    border: '1px solid var(--glass-border)',
                    background: 'var(--bg-sunken)',
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    minWidth: 150,
                    justifyContent: 'space-between',
                  }}
                >
                  {SCOPES.find(([id]) => id === scope)?.[1]}
                  <ChevronIcon dir="down" size={14} />
                </motion.button>
                <AnimatePresence>
                  {scopeOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={transition('snappy')}
                      role="listbox"
                      className="glass"
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 38,
                        zIndex: 3,
                        width: 190,
                        padding: 5,
                        borderRadius: 10,
                        transformOrigin: 'top right',
                      }}
                    >
                      {SCOPES.map(([id, label]) => (
                        <button
                          key={id}
                          role="option"
                          aria-selected={scope === id}
                          onClick={() => {
                            setScope(id);
                            setScopeOpen(false);
                            setCursor(0);
                            input.current?.focus();
                          }}
                          className="row-hover"
                          style={{
                            display: 'flex',
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: 6,
                            fontSize: 13,
                            color: scope === id ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: scope === id ? 600 : 500,
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* List and preview */}
            <div
              style={{
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 0.95fr) minmax(0, 1.25fr)',
                minHeight: 0,
              }}
            >
              <div
                ref={list}
                style={{
                  position: 'relative',
                  overflowY: 'auto',
                  padding: 7,
                  borderRight: '1px solid var(--glass-border)',
                }}
              >
                {/* One highlight that slides to the row under the cursor. Measured and
                    moved by hand rather than with a shared layout animation, which held
                    the closing palette on screen, invisible, over the whole window. */}
                {rows.length > 0 && (
                  <motion.span
                    aria-hidden="true"
                    initial={false}
                    animate={{ y: highlight.top, height: highlight.height, opacity: highlight.height ? 1 : 0 }}
                    transition={spring.snappy}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 7,
                      right: 7,
                      borderRadius: 8,
                      background: 'var(--bg-selected)',
                      boxShadow: 'inset 0 1px 0 var(--glass-highlight)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {rows.length === 0 && (
                  <p style={{ padding: 16, color: 'var(--text-faint)', fontSize: 13, lineHeight: 1.6 }}>
                    {query.trim()
                      ? `Nothing matches “${query.trim()}”.`
                      : 'Try “john 3:16”, “James”, “lamp unto my feet”, or “quiz”.'}
                  </p>
                )}

                {rows.map((row, index) => {
                  const atCursor = index === cursor;
                  const group =
                    row.kind === 'passage'
                      ? 'Passage'
                      : row.kind === 'command'
                        ? query.trim()
                          ? 'Commands'
                          : 'Suggestions'
                        : row.kind === 'subject'
                          ? 'People & places'
                          : 'In the text';
                  const heading = group !== lastGroup ? group : null;
                  lastGroup = group;

                  return (
                    <div key={rowKey(row, index)}>
                      {heading && (
                        <div className="eyebrow" style={{ padding: '10px 10px 5px', fontSize: 10.5 }}>
                          {heading}
                        </div>
                      )}
                      <button
                        data-at-cursor={atCursor}
                        onClick={() => run(actionsFor(row)[0])}
                        onMouseMove={() => setCursor(index)}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          textAlign: 'start',
                          padding: '8px 10px',
                          borderRadius: 8,
                        }}
                      >
                        <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, width: '100%', minWidth: 0 }}>
                          <RowIcon row={row} />
                          <RowText row={row} />
                          {row.kind === 'command' && row.command.on && (
                            <span style={{ fontSize: 11, color: 'var(--text-tan)', fontWeight: 600 }}>On</span>
                          )}
                          {row.kind === 'command' && row.command.shortcut && (
                            <kbd className="kbd">{keyLabel(row.command.shortcut)}</kbd>
                          )}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div style={{ minHeight: 0, overflowY: 'auto' }}>
                {/* Keyed so each row's preview fades in fresh. Deliberately no exit
                    animation: a nested exit still running when the palette closes kept
                    the whole palette mounted, invisible, over the window. */}
                <motion.div
                  key={current ? rowKey(current, cursor) : 'empty'}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.14 }}
                  style={{ height: '100%' }}
                >
                  <Preview row={current} edition={edition} books={books} />
                </motion.div>
              </div>
            </div>

            {/* Action bar */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                height: 44,
                padding: '0 10px 0 14px',
                borderTop: '1px solid var(--glass-border)',
                background: 'color-mix(in srgb, var(--bg-shell) 55%, transparent)',
                fontSize: 12.5,
                color: 'var(--text-secondary)',
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'linear-gradient(145deg, var(--tan-400), var(--tan-600))',
                  color: 'var(--main-on)',
                  font: '400 12px var(--font-display)',
                }}
              >
                R
              </span>
              <span style={{ color: 'var(--text-faint)' }}>
                Tab to change what is searched
              </span>
              <span style={{ flex: 1 }} />
              {primary && (
                <button
                  onClick={() => run(primary)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontWeight: 600 }}
                >
                  {primary.label}
                  <kbd className="kbd">↵</kbd>
                </button>
              )}
              <span style={{ width: 1, height: 18, background: 'var(--glass-border)' }} />
              <button
                onClick={() => setActionsOpen((value) => !value)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                Actions
                <kbd className="kbd">{keyLabel('Mod')}</kbd>
                <kbd className="kbd">K</kbd>
              </button>
            </div>

            <AnimatePresence>
              {actionsOpen && current && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={transition('snappy')}
                  className="glass"
                  role="menu"
                  style={{
                    position: 'absolute',
                    right: 10,
                    bottom: 50,
                    width: 250,
                    padding: 5,
                    borderRadius: 11,
                    transformOrigin: 'bottom right',
                    zIndex: 4,
                  }}
                >
                  {actionsFor(current).map((action, index) => (
                    <button
                      key={action.label}
                      role="menuitem"
                      onClick={() => run(action)}
                      className="row-hover"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 7,
                        fontSize: 13,
                        fontWeight: index === 0 ? 600 : 500,
                      }}
                    >
                      <span style={{ flex: 1, textAlign: 'start' }}>{action.label}</span>
                      {index === 0 ? (
                        <kbd className="kbd">↵</kbd>
                      ) : action.shortcut ? (
                        <kbd className="kbd">{keyLabel(action.shortcut)}</kbd>
                      ) : null}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function rowKey(row: Row, index: number): string {
  if (row.kind === 'passage') return `p-${row.book.id}-${row.chapter}-${row.verse ?? ''}`;
  if (row.kind === 'command') return `c-${row.command.id}`;
  if (row.kind === 'subject') return `s-${row.subject.id}`;
  return `h-${row.hit.bookId}-${row.hit.chapter}-${row.hit.verse}-${index}`;
}

function RowIcon({ row }: { row: Row }) {
  let icon: ReactNode;
  let tone = 'var(--text-secondary)';
  if (row.kind === 'passage') icon = <BookIcon size={16} />;
  else if (row.kind === 'hit') icon = <ScrollIcon size={16} />;
  else if (row.kind === 'subject') {
    const place = row.subject.kind === 'place';
    icon = place ? <PlaceIcon size={16} /> : <PersonIcon size={16} />;
    tone = place ? 'var(--mark-place)' : 'var(--mark-name)';
  } else icon = row.command.icon ?? <ArrowIcon size={15} />;

  return (
    <span
      style={{
        width: 26,
        height: 26,
        flex: 'none',
        borderRadius: 7,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg-sunken)',
        border: '1px solid var(--line-default)',
        color: tone,
      }}
    >
      {icon}
    </span>
  );
}

function RowText({ row }: { row: Row }) {
  const title =
    row.kind === 'passage'
      ? `${row.book.name} ${row.chapter}${row.verse ? `:${row.verse}` : ''}`
      : row.kind === 'command'
        ? row.command.title
        : row.kind === 'subject'
          ? row.subject.name
          : `${row.hit.book} ${row.hit.chapter}:${row.hit.verse}`;
  const sub =
    row.kind === 'passage'
      ? 'Open the passage'
      : row.kind === 'command'
        ? row.command.hint
        : row.kind === 'subject'
          ? row.descriptor
          : row.hit.text;

  return (
    <span style={{ minWidth: 0, flex: 1 }}>
      <span style={{ display: 'block', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {title}
      </span>
      {sub && (
        <span
          style={{
            display: 'block',
            fontSize: 12,
            color: 'var(--text-faint)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sub}
        </span>
      )}
    </span>
  );
}

/** What the highlighted row leads to, shown before it is chosen. */
function Preview({ row, edition, books }: { row: Row | undefined; edition: EditionId; books: Book[] }) {
  const [verses, setVerses] = useState<Verse[] | null>(null);

  useEffect(() => {
    setVerses(null);
    if (!row || row.kind !== 'passage') return;
    let live = true;
    void loadChapter(row.book, row.chapter).then((found) => live && setVerses(found));
    return () => {
      live = false;
    };
  }, [row]);

  if (!row) {
    return (
      <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
        Nothing selected
      </div>
    );
  }

  if (row.kind === 'passage') {
    const shown = verses
      ? row.verse
        ? verses.filter((verse) => Math.abs(verse.number - row.verse!) <= 2)
        : verses.slice(0, 6)
      : [];
    return (
      <PreviewFrame
        eyebrow="Passage"
        title={`${row.book.name} ${row.chapter}${row.verse ? `:${row.verse}` : ''}`}
        info={[
          ['Book', row.book.name],
          ['Testament', row.book.testament === 'OT' ? 'Old Testament' : 'New Testament'],
          ['Chapters', String(row.book.chapters)],
          ['Words in book', row.book.words.toLocaleString()],
        ]}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15.5, lineHeight: 1.65 }}>
          {shown.map((verse) => (
            <span
              key={verse.number}
              style={{ color: row.verse && verse.number !== row.verse ? 'var(--text-faint)' : 'var(--text-primary)' }}
            >
              <sup style={{ font: '600 10px var(--font-ui)', color: 'var(--text-faint)', marginRight: 3 }}>
                {verse.number}
              </sup>
              {verse.text}{' '}
            </span>
          ))}
          {!verses && <span style={{ color: 'var(--text-faint)' }}>Opening…</span>}
        </div>
      </PreviewFrame>
    );
  }

  if (row.kind === 'hit') {
    const [before, match, after] = around(row.hit);
    return (
      <PreviewFrame
        eyebrow="Found in the text"
        title={`${row.hit.book} ${row.hit.chapter}:${row.hit.verse}`}
        info={[
          ['Book', row.hit.book],
          ['Chapter', String(row.hit.chapter)],
          ['Verse', String(row.hit.verse)],
          ['Edition', editionById(edition).title],
        ]}
      >
        <p dir={editionById(edition).direction} style={{ fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1.65 }}>
          {before}
          <mark style={{ background: 'color-mix(in srgb, var(--main-fill) 40%, transparent)', color: 'inherit', borderRadius: 3, padding: '0 1px' }}>
            {match}
          </mark>
          {after}
        </p>
      </PreviewFrame>
    );
  }

  if (row.kind === 'subject') {
    const subject = row.subject;
    const first = subject.where[0];
    const firstBook = first ? books.find((book) => book.id === first[0]) : undefined;
    return (
      <PreviewFrame
        eyebrow={subject.kind === 'place' ? 'Place' : 'Person'}
        title={subject.name}
        subtitle={row.descriptor}
        info={[
          ['Named in', `${subject.total.toLocaleString()} ${subject.total === 1 ? 'verse' : 'verses'}`],
          ...(firstBook && first ? [['First named', `${firstBook.name} ${first[1]}:${first[2]}`] as [string, string]] : []),
          ...(subject.tribe ? [['Tribe', subject.tribe] as [string, string]] : []),
          ...(subject.area ? [['Region', subject.area] as [string, string]] : []),
        ]}
      >
        {subject.summary && <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{subject.summary}</p>}
      </PreviewFrame>
    );
  }

  return (
    <PreviewFrame
      eyebrow={row.command.group}
      title={row.command.title}
      info={[
        ...(row.command.shortcut ? [['Shortcut', keyLabel(row.command.shortcut)] as [string, string]] : []),
        ['Group', row.command.group],
        ...(row.command.on !== undefined ? [['State', row.command.on ? 'On' : 'Off'] as [string, string]] : []),
      ]}
    >
      {row.command.hint && <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{row.command.hint}</p>}
    </PreviewFrame>
  );
}

function PreviewFrame({
  eyebrow,
  title,
  subtitle,
  info,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  info: Array<[string, string]>;
  children?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ padding: '22px 22px 18px', flex: 1 }}>
        <div className="eyebrow">{eyebrow}</div>
        <h2 style={{ fontSize: 26, marginTop: 6, lineHeight: 1.15 }}>{title}</h2>
        {subtitle && <div style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: 13 }}>{subtitle}</div>}
        <div style={{ marginTop: 14 }}>{children}</div>
      </div>
      <div style={{ borderTop: '1px solid var(--glass-border)', padding: '12px 22px 14px' }}>
        <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 6, color: 'var(--text-secondary)' }}>Information</div>
        {info.map(([label, value]) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: '6px 0',
              borderTop: '1px solid var(--line-faint)',
              fontSize: 12.5,
            }}
          >
            <span style={{ color: 'var(--text-faint)' }}>{label}</span>
            <span className="tabular" style={{ fontWeight: 600, textAlign: 'end' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <motion.span
      aria-label="Searching"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
      style={{
        width: 14,
        height: 14,
        borderRadius: 99,
        border: '2px solid var(--line-strong)',
        borderTopColor: 'var(--text-tan)',
      }}
    />
  );
}
