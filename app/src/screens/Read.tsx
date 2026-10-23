import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  books as loadBooks,
  chapter as loadChapter,
  nextChapter,
  previousChapter,
} from '../lib/bible';
import type { Book, Verse } from '../lib/bible';
import type { EditionId } from '../lib/editions';
import { editionById, editionsFor } from '../lib/editions';
import { markUp } from '../lib/marks';
import { useProgress } from '../lib/progress';
import { useSaved } from '../lib/saved';
import { useSettings } from '../lib/settings';
import { HIGHLIGHT_OPACITY, QUICK_PICKS } from '../lib/highlights';
import { pageVariants, spring, transition } from '../lib/motion';
import { BookPickerHost } from '../components/BookPicker';
import { MarkPopover } from '../components/MarkPopover';
import type { Anchored } from '../components/MarkPopover';
import { BookIntro } from '../components/BookIntro';
import { SidePanel } from '../components/SidePanel';
import type { PanelTab } from '../components/SidePanel';
import { Menu } from '../components/Menu';
import { SearchSheet } from '../components/SearchSheet';
import { WordPopover } from '../components/WordPopover';
import { Review } from '../components/Review';
import { Plan } from '../components/Plan';
import { Quiz } from '../components/Quiz';
import { useReview } from '../lib/review';
import type { WordAnchor } from '../components/WordPopover';
import { wordsForBook } from '../lib/words';
import type { Word } from '../lib/words';
import {
  BookmarkIcon,
  ChevronIcon,
  CalendarIcon,
  CheckIcon,
  HighlightIcon,
  InfoIcon,
  NoteIcon,
  SearchIcon,
  ScrollIcon,
  TargetIcon,
} from '../components/Icons';

type Highlights = Record<string, number>;

function verseKey(bookId: number, chapter: number, verse: number) {
  return `${bookId}:${chapter}:${verse}`;
}

function loadHighlights(): Highlights {
  try {
    return JSON.parse(localStorage.getItem('rhema.highlights') ?? '{}') as Highlights;
  } catch {
    return {};
  }
}

export function Read() {
  const { settings } = useSettings();
  const { progress, visit, toggleRead, isRead } = useProgress();
  const { saved, isSaved, toggle: toggleSaved } = useSaved();
  const { dueCount, sync: syncReview } = useReview();

  const [all, setAll] = useState<Book[]>([]);
  const [book, setBook] = useState<Book | null>(null);
  const [number, setNumber] = useState(1);
  const [edition, setEdition] = useState<EditionId>('kjv');
  const [verses, setVerses] = useState<Verse[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<Highlights>(loadHighlights);
  const [anchored, setAnchored] = useState<Anchored | null>(null);
  const [picking, setPicking] = useState(false);
  const [searching, setSearching] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [quizzing, setQuizzing] = useState(false);
  const [wordAnchor, setWordAnchor] = useState<WordAnchor | null>(null);
  // The words of the chapter on screen, when an original edition is open.
  const [chapterWords, setChapterWords] = useState<Record<string, Word[]> | null>(null);
  const [panel, setPanel] = useState<PanelTab | null>('notes');
  const [showIntro, setShowIntro] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBooks()
      .then((list) => {
        setAll(list);
        const resume = progress.last;
        const opening = resume
          ? list.find((candidate) => candidate.id === resume.bookId)
          : undefined;
        setBook(opening ?? list[0] ?? null);
        if (opening && resume) setNumber(resume.chapter);
      })
      .catch((cause: Error) => setError(cause.message));
    // The saved position decides where to open, and is not followed afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every saved verse gets a review card as soon as it is saved, so the count in the
  // header is right without having to open review first.
  useEffect(() => {
    syncReview(saved.map((verse) => `${verse.bookId}:${verse.chapter}:${verse.verse}`));
  }, [saved, syncReview]);

  const available = useMemo(() => (book ? editionsFor(book.testament) : []), [book]);

  // Moving from an Old Testament book to a New one leaves the Hebrew behind, and the
  // other way round leaves the Greek. Fall back to the English rather than an empty page.
  useEffect(() => {
    if (book && !available.some((candidate) => candidate.id === edition)) setEdition('kjv');
  }, [book, available, edition]);

  useEffect(() => {
    if (!book) return;
    setSelected(null);
    setAnchored(null);
    loadChapter(book, number, edition)
      .then(setVerses)
      .catch((cause: Error) => setError(cause.message));
    if (edition === 'kjv') visit(book.id, number);

    setWordAnchor(null);
    if (edition === 'kjv') {
      setChapterWords(null);
    } else {
      void wordsForBook(edition, book.id).then(setChapterWords);
    }
  }, [book, number, edition, visit]);

  useEffect(() => {
    try {
      localStorage.setItem('rhema.highlights', JSON.stringify(highlights));
    } catch {
      // Losing a highlight is not worth interrupting a reading session over.
    }
  }, [highlights]);

  const goTo = useCallback((to: { book: Book; chapter: number } | null) => {
    if (!to) return;
    setBook(to.book);
    setNumber(to.chapter);
    setShowIntro(true);
  }, []);

  const previous = useMemo(
    () => (book ? previousChapter(all, book, number) : null),
    [all, book, number],
  );
  const next = useMemo(() => (book ? nextChapter(all, book, number) : null), [all, book, number]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearching(true);
        return;
      }
      if (picking || searching || reviewing || planning || quizzing) return;
      if (event.target instanceof HTMLTextAreaElement) return;
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === 'ArrowLeft') goTo(previous);
      if (event.key === 'ArrowRight') goTo(next);
      if (event.key === 'Escape') setSelected(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previous, next, picking, searching, reviewing, planning, quizzing, goTo]);

  if (error) {
    return (
      <div style={{ padding: '56px 32px', maxWidth: '60ch' }}>
        <h1 style={{ fontSize: 26 }}>The text is not loaded</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 10 }}>{error}</p>
      </div>
    );
  }

  if (!book) return <div style={{ padding: 56, color: 'var(--text-secondary)' }}>Opening…</div>;

  const current = editionById(edition);
  const read = isRead(book.id, number);
  const atStart = number === 1 && showIntro && edition === 'kjv';
  const selectedVerse = verses.find((verse) => verse.number === selected);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 14px',
          height: 56,
          flex: 'none',
          borderBottom: '1px solid var(--line-default)',
          background: 'var(--bg-shell)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: 'var(--main-fill)',
            color: 'var(--main-on)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            flex: 'none',
            marginRight: 4,
          }}
        >
          R
        </span>

        <Round label="Previous chapter" disabled={!previous} onClick={() => goTo(previous)}>
          <ChevronIcon dir="left" size={18} />
        </Round>

        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={spring.snappy}
          onClick={() => setPicking(true)}
          aria-label={`Reading ${book.name} ${number}. Choose another book or chapter.`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 999,
            background: 'var(--bg-sunken)',
            fontWeight: 600,
          }}
        >
          {book.name} {number}
          <ChevronIcon dir="down" size={14} />
        </motion.button>

        <Round label="Next chapter" disabled={!next} onClick={() => goTo(next)}>
          <ChevronIcon dir="right" size={18} />
        </Round>

        <Round label="Search the Bible" onClick={() => setSearching(true)}>
          <SearchIcon size={18} />
        </Round>

        {available.length > 1 && (
          <div
            role="group"
            aria-label="Edition"
            style={{
              display: 'flex',
              gap: 2,
              marginLeft: 10,
              padding: 3,
              borderRadius: 999,
              background: 'var(--bg-sunken)',
            }}
          >
            {available.map((option) => (
              <button
                key={option.id}
                onClick={() => setEdition(option.id)}
                aria-pressed={edition === option.id}
                title={option.title}
                style={{
                  position: 'relative',
                  padding: '5px 13px',
                  borderRadius: 999,
                  fontWeight: 600,
                  fontSize: 13,
                  color: edition === option.id ? 'var(--main-on)' : 'var(--text-secondary)',
                }}
              >
                {edition === option.id && (
                  <motion.span
                    layoutId="edition-pill"
                    transition={spring.snappy}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 999,
                      background: 'var(--main-fill)',
                    }}
                  />
                )}
                <span style={{ position: 'relative' }}>{option.label}</span>
              </button>
            ))}
          </div>
        )}

        <span style={{ flex: 1 }} />

        <Pill
          active={read}
          onClick={() => toggleRead(book.id, number)}
          label={read ? 'Read' : 'Mark read'}
        >
          <CheckIcon size={15} />
        </Pill>

        <motion.button
          whileTap={{ scale: 0.96 }}
          transition={spring.snappy}
          onClick={() => setReviewing(true)}
          aria-label={dueCount > 0 ? `Review, ${dueCount} due` : 'Review'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 13px',
            borderRadius: 999,
            fontWeight: 600,
            fontSize: 13,
            marginRight: 4,
            background: dueCount > 0 ? 'var(--main-fill)' : 'transparent',
            color: dueCount > 0 ? 'var(--main-on)' : 'var(--text-secondary)',
            border: `1px solid ${dueCount > 0 ? 'var(--main-fill)' : 'var(--line-default)'}`,
          }}
        >
          <ScrollIcon size={15} />
          Review
          {dueCount > 0 && <span className="tabular">{dueCount}</span>}
        </motion.button>

        <Round label="Reading plan" active={planning} onClick={() => setPlanning(true)}>
          <CalendarIcon size={18} />
        </Round>
        <Round label="Quiz" active={quizzing} onClick={() => setQuizzing(true)}>
          <TargetIcon size={18} />
        </Round>
        <Round
          label="Notes"
          active={panel === 'notes'}
          onClick={() => setPanel(panel === 'notes' ? null : 'notes')}
        >
          <NoteIcon size={18} />
        </Round>
        <Round
          label="Saved verses"
          active={panel === 'saved'}
          onClick={() => setPanel(panel === 'saved' ? null : 'saved')}
        >
          <BookmarkIcon size={18} />
        </Round>

        <Menu books={all} progress={progress} />
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          <AnimatePresence mode="wait">
            <motion.article
              key={`${book.id}:${number}:${edition}`}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition('smooth')}
              style={{ padding: '36px 32px 96px' }}
            >
              {atStart && <BookIntro book={book.name} onRead={() => setShowIntro(false)} />}

              <div style={{ maxWidth: 'var(--reading-width)', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <h1 style={{ fontSize: 32 }}>
                    {book.name} {number}
                  </h1>
                  {!atStart && number === 1 && (
                    <button
                      onClick={() => setShowIntro(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        color: 'var(--text-secondary)',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <InfoIcon size={14} />
                      About
                    </button>
                  )}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 6px' }}>
                  {current.title}
                </div>
                {current.caveat && (
                  <p
                    style={{
                      margin: '0 0 22px',
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: 'var(--text-faint)',
                      maxWidth: '58ch',
                    }}
                  >
                    {current.caveat}
                  </p>
                )}
                {!current.caveat && <div style={{ height: 20 }} />}

                {verses.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>
                    This edition has nothing for {book.name} {number}.
                  </p>
                ) : (
                  <div
                    className="reading selectable"
                    dir={current.direction}
                    style={{ fontFamily: current.font, textAlign: 'start' }}
                  >
                    {verses.map((verse) => {
                      const colour = highlights[verseKey(book.id, number, verse.number)];
                      const chosen = QUICK_PICKS.find((pick) => pick.index === colour);
                      const isSelected = selected === verse.number;

                      return (
                        <span key={verse.number}>
                          {verse.heading && (
                            <span
                              style={{
                                display: 'block',
                                marginTop: verse.number === 1 ? 0 : '1.2em',
                                marginBottom: '0.35em',
                                font: '600 11px var(--font-ui)',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {verse.heading}
                            </span>
                          )}
                          <span
                            style={{
                              borderRadius: 3,
                              boxDecorationBreak: 'clone',
                              WebkitBoxDecorationBreak: 'clone',
                              background: chosen
                                ? `color-mix(in srgb, ${chosen.colour} ${HIGHLIGHT_OPACITY * 100}%, transparent)`
                                : undefined,
                              outline: isSelected ? '2px solid var(--focus-ring)' : undefined,
                              outlineOffset: 1,
                            }}
                          >
                            {settings.verseNumbers && (
                              <button
                                onClick={() => setSelected(isSelected ? null : verse.number)}
                                aria-label={`Select verse ${verse.number}`}
                                className="tabular"
                                style={{
                                  font: '600 0.58em var(--font-ui)',
                                  verticalAlign: 'super',
                                  color: 'var(--text-faint)',
                                  margin: '0 0.3em 0 0',
                                }}
                              >
                                {verse.number}
                              </button>
                            )}
                            {/* Marks belong to the English; an original is read word by word. */}
                            {edition !== 'kjv' && chapterWords
                              ? (chapterWords[`${number}:${verse.number}`] ?? []).map(
                                  (word, index) => (
                                    <button
                                      key={index}
                                      onClick={(event) => {
                                        const box = event.currentTarget.getBoundingClientRect();
                                        setWordAnchor({
                                          word,
                                          edition,
                                          bookId: book.id,
                                          book: book.name,
                                          x: box.left + box.width / 2,
                                          y: box.bottom,
                                        });
                                      }}
                                      style={{
                                        font: 'inherit',
                                        borderRadius: 3,
                                        padding: '0 1px',
                                      }}
                                      className="word"
                                    >
                                      {word[0]}
                                    </button>
                                  ),
                                )
                              : edition === 'kjv'
                                ? markUp(verse.text).map((piece, index) =>
                                    piece.type === 'text' ? (
                                      <span key={index}>{piece.text}</span>
                                    ) : (
                                      <button
                                        key={index}
                                        onClick={(event) => {
                                          const box = event.currentTarget.getBoundingClientRect();
                                          setAnchored({
                                            subject: piece.subject,
                                            at: { book: book.name, chapter: number },
                                            x: box.left + box.width / 2,
                                            y: box.bottom,
                                          });
                                        }}
                                        style={{
                                          font: 'inherit',
                                          color:
                                            piece.subject.kind === 'person'
                                              ? 'var(--mark-name)'
                                              : 'var(--mark-place)',
                                          borderBottom:
                                            '1.5px solid color-mix(in srgb, currentColor 40%, transparent)',
                                          borderRadius: 2,
                                        }}
                                      >
                                        {piece.text}
                                      </button>
                                    ),
                                  )
                                : verse.text}{' '}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.article>
          </AnimatePresence>
        </div>

        <SidePanel
          open={panel !== null}
          tab={panel ?? 'notes'}
          onTab={setPanel}
          onClose={() => setPanel(null)}
          book={book}
          chapter={number}
          onOpenVerse={(bookId, chapterNumber) => {
            const target = all.find((candidate) => candidate.id === bookId);
            if (target) goTo({ book: target, chapter: chapterNumber });
          }}
        />
      </div>

      {/* Verse actions, floating over the page rather than pushing it about. */}
      <AnimatePresence>
        {selected !== null && selectedVerse && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={transition('snappy')}
            role="toolbar"
            aria-label={`Verse ${selected}`}
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 24,
              transform: 'translateX(-50%)',
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 16px',
              borderRadius: 999,
              background: 'var(--bg-card)',
              border: '1px solid var(--line-default)',
              boxShadow: 'var(--shadow-shell)',
            }}
          >
            <strong className="tabular" style={{ fontSize: 13 }}>
              {book.name} {number}:{selected}
            </strong>

            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <HighlightIcon size={15} />
              {QUICK_PICKS.map((pick) => (
                <motion.button
                  key={pick.index}
                  whileHover={{ scale: 1.2 }}
                  transition={spring.snappy}
                  onClick={() =>
                    setHighlights((currentMarks) => ({
                      ...currentMarks,
                      [verseKey(book.id, number, selected)]: pick.index,
                    }))
                  }
                  aria-label={`Highlight ${pick.name}`}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: pick.colour,
                    border: '2px solid var(--bg-card)',
                    boxShadow: '0 0 0 1px var(--line-default)',
                  }}
                />
              ))}
              <button
                onClick={() =>
                  setHighlights((currentMarks) => {
                    const copy = { ...currentMarks };
                    delete copy[verseKey(book.id, number, selected)];
                    return copy;
                  })
                }
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}
              >
                Clear
              </button>
            </span>

            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={spring.snappy}
              onClick={() => {
                setPanel('saved');
                toggleSaved({
                  bookId: book.id,
                  book: book.name,
                  chapter: number,
                  verse: selected,
                  text: selectedVerse.text,
                  edition,
                });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 13,
                background: isSaved(book.id, number, selected)
                  ? 'var(--main-fill)'
                  : 'var(--bg-sunken)',
                color: isSaved(book.id, number, selected)
                  ? 'var(--main-on)'
                  : 'var(--text-primary)',
              }}
            >
              <BookmarkIcon size={15} filled={isSaved(book.id, number, selected)} />
              {isSaved(book.id, number, selected) ? 'Saved' : 'Save'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <Review open={reviewing} onClose={() => setReviewing(false)} />

      <Quiz
        open={quizzing}
        onClose={() => setQuizzing(false)}
        book={book}
        books={all}
        onOpenVerse={(bookId, chapterNumber) => {
          const target = all.find((candidate) => candidate.id === bookId);
          if (target) goTo({ book: target, chapter: chapterNumber });
        }}
      />

      <Plan
        open={planning}
        onClose={() => setPlanning(false)}
        books={all}
        onOpen={(bookId, chapterNumber) => {
          const target = all.find((candidate) => candidate.id === bookId);
          if (target) goTo({ book: target, chapter: chapterNumber });
        }}
      />

      <SearchSheet
        open={searching}
        edition={edition}
        onClose={() => setSearching(false)}
        onGo={(hit) => {
          const target = all.find((candidate) => candidate.id === hit.bookId);
          if (target) {
            setBook(target);
            setNumber(hit.chapter);
            setShowIntro(false);
            setSelected(hit.verse);
          }
          setSearching(false);
        }}
      />

      <WordPopover
        anchor={wordAnchor}
        onClose={() => setWordAnchor(null)}
        onGo={(chapterNumber, verseNumber) => {
          setNumber(chapterNumber);
          setSelected(verseNumber);
          setWordAnchor(null);
        }}
      />

      <MarkPopover anchored={anchored} onClose={() => setAnchored(null)} />

      <BookPickerHost
        open={picking}
        books={all}
        current={book}
        onChoose={(chosenBook, chosenChapter) => {
          setBook(chosenBook);
          setNumber(chosenChapter);
          setShowIntro(true);
          setPicking(false);
        }}
        onClose={() => setPicking(false)}
      />
    </div>
  );
}

function Round({
  label,
  disabled,
  active,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.92 }}
      transition={spring.snappy}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      style={{
        width: 34,
        height: 34,
        borderRadius: 9,
        display: 'grid',
        placeItems: 'center',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: active ? 'var(--bg-selected)' : 'transparent',
        opacity: disabled ? 0.3 : 1,
      }}
    >
      {children}
    </motion.button>
  );
}

function Pill({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={spring.snappy}
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 13px',
        borderRadius: 999,
        fontWeight: 600,
        fontSize: 13,
        marginRight: 4,
        background: active ? 'var(--main-fill)' : 'transparent',
        color: active ? 'var(--main-on)' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'var(--main-fill)' : 'var(--line-default)'}`,
      }}
    >
      {children}
      {label}
    </motion.button>
  );
}
