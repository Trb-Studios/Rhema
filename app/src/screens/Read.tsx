import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { markUp, marksFor } from '../lib/marks';
import type { BookMarks } from '../lib/marks';
import { useProgress } from '../lib/progress';
import { useSaved } from '../lib/saved';
import { useSettings } from '../lib/settings';
import { HIGHLIGHT_OPACITY, QUICK_PICKS, useHighlights } from '../lib/highlights';
import { pageVariants, spring, transition } from '../lib/motion';
import { BookPickerHost } from '../components/BookPicker';
import { MarkPopover } from '../components/MarkPopover';
import type { Anchored } from '../components/MarkPopover';
import { BookIntro } from '../components/BookIntro';
import { SidePanel } from '../components/SidePanel';
import type { PanelTab } from '../components/SidePanel';
import { Menu } from '../components/Menu';
import { SearchSheet } from '../components/SearchSheet';
import { CommandPalette } from '../components/CommandPalette';
import { Tip } from '../components/Tip';
import { Parallel } from '../components/Parallel';
import { ListenBar } from '../components/ListenBar';
import { Library } from '../components/Library';
import { useSpeech } from '../lib/speech';
import { ColumnsIcon, SpeakerIcon, LayersIcon } from '../components/Icons';
import { keyLabel, matches } from '../lib/commands';
import type { Command } from '../lib/commands';
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
  LinkIcon,
  SearchIcon,
  ScrollIcon,
  TargetIcon,
} from '../components/Icons';

export function Read() {
  const { settings, update } = useSettings();
  const { progress, visit, toggleRead, isRead } = useProgress();
  const { saved, isSaved, toggle: toggleSaved } = useSaved();
  const { dueCount, sync: syncReview } = useReview();

  const [all, setAll] = useState<Book[]>([]);
  const [book, setBook] = useState<Book | null>(null);
  const [number, setNumber] = useState(1);
  const [edition, setEdition] = useState<EditionId>('kjv');
  const [verses, setVerses] = useState<Verse[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const { colourOf, mark, clear } = useHighlights();
  const [anchored, setAnchored] = useState<Anchored | null>(null);
  const [picking, setPicking] = useState(false);
  const [searching, setSearching] = useState(false);
  const [palette, setPalette] = useState(false);
  // The other edition shown beside this one, or null for a single column.
  const [beside, setBeside] = useState<EditionId | null>(null);
  const [listening, setListening] = useState(false);
  const [library, setLibrary] = useState(false);
  const speech = useSpeech();
  const [reviewing, setReviewing] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [quizzing, setQuizzing] = useState(false);
  const [wordAnchor, setWordAnchor] = useState<WordAnchor | null>(null);
  // The words of the chapter on screen, when an original edition is open.
  const [chapterWords, setChapterWords] = useState<Record<string, Word[]> | null>(null);
  // Which individuals are named in each verse of this book, from the build.
  const [bookMarks, setBookMarks] = useState<BookMarks>({});
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

  useEffect(() => {
    if (!book) return;
    let current = true;
    setBookMarks({});
    void marksFor(book.id).then((found) => {
      if (current) setBookMarks(found);
    });
    return () => {
      current = false;
    };
  }, [book]);

  const available = useMemo(() => (book ? editionsFor(book.testament) : []), [book]);

  // Moving from an Old Testament book to a New one leaves the Hebrew behind, and the
  // other way round leaves the Greek. Fall back to the English rather than an empty page.
  useEffect(() => {
    if (book && !available.some((candidate) => candidate.id === edition)) setEdition('kjv');
  }, [book, available, edition]);

  // The Hebrew does not cover the New Testament, nor the Greek the Old, so moving
  // between the two testaments leaves a parallel column with nothing to show.
  useEffect(() => {
    if (!beside) return;
    const stillThere = available.some((candidate) => candidate.id === beside);
    if (!stillThere || beside === edition) setBeside(null);
  }, [available, beside, edition]);

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

  const commandsRef = useRef<Command[]>([]);
  const anyOverlay =
    library || picking || searching || palette || reviewing || planning || quizzing;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // The palette opens from anywhere, including from inside the notepad.
      if (matches(event, 'Mod+K')) {
        event.preventDefault();
        setPalette(true);
        return;
      }

      const typing =
        event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement;

      // A command's own shortcut uses a modifier, so it still works while typing.
      for (const command of commandsRef.current) {
        const shortcut = command.shortcut;
        if (!shortcut || !shortcut.includes('Mod') || command.available === false) continue;
        if (matches(event, shortcut)) {
          event.preventDefault();
          command.run();
          return;
        }
      }

      if (anyOverlay || typing) return;
      if (event.key === 'ArrowLeft') goTo(previous);
      if (event.key === 'ArrowRight') goTo(next);
      if (event.key === 'Escape') setSelected(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previous, next, anyOverlay, goTo]);

  // Everything the app can do, in one list. The palette, the shortcuts and the header
  // all read from it, so a command cannot be reachable one way and missing another.
  const commands: Command[] = useMemo(() => {
    const panels: Array<[PanelTab, string, string, string]> = [
      ['notes', 'Notes', 'Mod+J', 'write journal'],
      ['refs', 'Cross-references', 'Mod+L', 'links related parallel'],
      ['saved', 'Saved verses', 'Mod+B', 'bookmarks kept'],
    ];

    const list: Command[] = [
      {
        id: 'next',
        title: 'Next chapter',
        group: 'Go',
        shortcut: '\u2192',
        available: Boolean(next),
        run: () => goTo(next),
      },
      {
        id: 'previous',
        title: 'Previous chapter',
        group: 'Go',
        shortcut: '\u2190',
        available: Boolean(previous),
        run: () => goTo(previous),
      },
      {
        id: 'pick',
        title: 'Choose a book',
        hint: 'Browse all 66 books and their chapters',
        group: 'Go',
        keywords: 'chapter jump navigate',
        run: () => setPicking(true),
      },
      {
        id: 'search',
        title: 'Search the text',
        hint: 'Every verse of the edition you are reading',
        group: 'Go',
        shortcut: 'Mod+F',
        keywords: 'find concordance',
        run: () => setSearching(true),
      },
      {
        id: 'read',
        title: book && isRead(book.id, number) ? 'Mark unread' : 'Mark read',
        hint: 'Counts towards your progress and streak',
        group: 'Read',
        shortcut: 'Mod+Enter',
        run: () => book && toggleRead(book.id, number),
      },
      {
        id: 'plan',
        title: 'Reading plan',
        hint: 'What to read today, and how far through you are',
        group: 'Read',
        shortcut: 'Mod+P',
        keywords: 'schedule pace days',
        run: () => setPlanning(true),
      },
      {
        id: 'review',
        title: 'Review',
        hint: 'Saved verses, resurfaced before you forget them',
        group: 'Study',
        shortcut: 'Mod+R',
        keywords: 'memorise spaced recall',
        run: () => setReviewing(true),
      },
      {
        id: 'quiz',
        title: 'Quiz this book',
        hint: 'Questions drawn from the text itself',
        group: 'Study',
        shortcut: 'Mod+Q',
        keywords: 'test questions',
        run: () => setQuizzing(true),
      },
    ];

    for (const [id, title, shortcut, keywords] of panels) {
      list.push({
        id: `panel-${id}`,
        title,
        group: 'Keep',
        shortcut,
        keywords,
        on: panel === id,
        run: () => setPanel(panel === id ? null : id),
      });
    }

    for (const option of available) {
      if (option.id === edition) continue;
      list.push({
        id: `edition-${option.id}`,
        title: `Read in ${option.label === 'English' ? 'English' : option.label}`,
        hint: option.title,
        group: 'View',
        keywords: `${option.title} hebrew greek original language`,
        run: () => setEdition(option.id),
      });
    }

    const other = available.find((candidate) => candidate.id !== edition);
    if (other) {
      list.push({
        id: 'parallel',
        title: beside ? 'Close the parallel column' : `Read beside the ${other.title}`,
        hint: beside ? undefined : 'Both editions at once, paired verse by verse',
        group: 'View',
        shortcut: 'Mod+Shift+P',
        keywords: 'parallel side by side compare interlinear original',
        on: Boolean(beside),
        run: () => setBeside(beside ? null : other.id),
      });
    }

    list.push({
      id: 'library',
      title: 'Your library',
      hint: 'Every note, highlight and saved verse in one place',
      group: 'Keep',
      shortcut: 'Mod+Shift+L',
      keywords: 'library notes highlights saved browse find all',
      on: library,
      run: () => setLibrary(!library),
    });

    if (speech.supported) {
      list.push({
        id: 'listen',
        title: listening ? 'Stop listening' : 'Read this chapter aloud',
        hint: listening ? undefined : 'Uses a voice already on this machine',
        group: 'Read',
        keywords: 'listen audio speak voice hear narration',
        on: listening,
        run: () => {
          if (listening) speech.stop();
          setListening(!listening);
        },
      });
    }

    list.push(
      {
        id: 'theme',
        title: settings.theme === 'dark' ? 'Switch to light' : 'Switch to dark',
        group: 'View',
        shortcut: 'Mod+Shift+D',
        keywords: 'theme appearance night',
        run: () => update('theme', settings.theme === 'dark' ? 'light' : 'dark'),
      },
      {
        id: 'bigger',
        title: 'Larger text',
        group: 'View',
        keywords: 'font size zoom',
        available: settings.size < 26,
        run: () => update('size', Math.min(26, settings.size + 1)),
      },
      {
        id: 'smaller',
        title: 'Smaller text',
        group: 'View',
        keywords: 'font size zoom',
        available: settings.size > 15,
        run: () => update('size', Math.max(15, settings.size - 1)),
      },
      {
        id: 'verse-numbers',
        title: settings.verseNumbers ? 'Hide verse numbers' : 'Show verse numbers',
        group: 'View',
        keywords: 'numbering clean',
        run: () => update('verseNumbers', !settings.verseNumbers),
      },
    );

    return list;
  }, [
    book,
    number,
    next,
    previous,
    goTo,
    panel,
    available,
    edition,
    settings.theme,
    settings.size,
    settings.verseNumbers,
    update,
    isRead,
    toggleRead,
    beside,
    listening,
    speech,
    library,
  ]);

  commandsRef.current = commands;

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
        className="app-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 14px',
          height: 56,
          flex: 'none',
          borderBottom: '1px solid var(--line-default)',
          background: 'var(--bg-shell)',
          // Narrow windows scroll the header sideways rather than wrapping it into
          // two rows, which pushed the text down and broke every label in half.
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
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

        <Round
          label="Previous chapter"
          shortcut="\u2190"
          disabled={!previous}
          onClick={() => goTo(previous)}
        >
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
            whiteSpace: 'nowrap',
            flex: 'none',
          }}
        >
          {book.name} {number}
          <ChevronIcon dir="down" size={14} />
        </motion.button>

        <Round label="Next chapter" shortcut="\u2192" disabled={!next} onClick={() => goTo(next)}>
          <ChevronIcon dir="right" size={18} />
        </Round>

        {speech.supported && (
          <Round
            label={listening ? 'Stop listening' : 'Read this chapter aloud'}
            active={listening}
            onClick={() => {
              if (listening) speech.stop();
              setListening(!listening);
            }}
          >
            <SpeakerIcon size={18} />
          </Round>
        )}

        {available.length > 1 && (
          <Round
            label={beside ? 'Close the parallel column' : 'Read two editions side by side'}
            shortcut="Mod+Shift+P"
            active={Boolean(beside)}
            onClick={() => {
              const other = available.find((candidate) => candidate.id !== edition);
              setBeside(beside ? null : (other?.id ?? null));
            }}
          >
            <ColumnsIcon size={18} />
          </Round>
        )}

        <Tip label="Search, go to a passage, or run a command" shortcut="Mod+K">
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={spring.snappy}
            onClick={() => setPalette(true)}
            aria-label="Search, go to a passage, or run a command"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 34,
              padding: '0 10px 0 11px',
              marginLeft: 2,
              borderRadius: 9,
              background: 'var(--bg-sunken)',
              color: 'var(--text-secondary)',
              fontSize: 13,
            }}
          >
            <SearchIcon size={16} />
            <span className="wide-only">Search</span>
            <kbd
              className="wide-only"
              style={{
                font: '500 11px var(--font-ui)',
                padding: '2px 6px',
                borderRadius: 5,
                border: '1px solid var(--line-default)',
                background: 'var(--bg-card)',
              }}
            >
              {keyLabel('Mod+K')}
            </kbd>
          </motion.button>
        </Tip>

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

        {/* The three ways of going over what has been read, kept together so they read
            as one group rather than three unrelated buttons. */}
        <div
          role="group"
          aria-label="Go over what you have read"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: 3,
            marginRight: 4,
            borderRadius: 11,
            background: 'var(--bg-sunken)',
          }}
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            transition={spring.snappy}
            onClick={() => setReviewing(true)}
            aria-label={dueCount > 0 ? `Review, ${dueCount} due` : 'Review'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 30,
              padding: dueCount > 0 ? '0 11px' : '0 9px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              background: dueCount > 0 ? 'var(--main-fill)' : 'transparent',
              color: dueCount > 0 ? 'var(--main-on)' : 'var(--text-secondary)',
            }}
          >
            <ScrollIcon size={17} />
            {dueCount > 0 && <span className="tabular">{dueCount}</span>}
          </motion.button>

          <Grouped
            label="Reading plan"
            shortcut="Mod+P"
            active={planning}
            onClick={() => setPlanning(true)}
          >
            <CalendarIcon size={17} />
          </Grouped>
          <Grouped
            label="Quiz"
            shortcut="Mod+Q"
            active={quizzing}
            onClick={() => setQuizzing(true)}
          >
            <TargetIcon size={17} />
          </Grouped>
        </div>
        <Round
          label="Notes"
          shortcut="Mod+J"
          active={panel === 'notes'}
          onClick={() => setPanel(panel === 'notes' ? null : 'notes')}
        >
          <NoteIcon size={18} />
        </Round>
        <Round
          label="Cross-references"
          shortcut="Mod+L"
          active={panel === 'refs'}
          onClick={() => setPanel(panel === 'refs' ? null : 'refs')}
        >
          <LinkIcon size={18} />
        </Round>
        <Round
          label="Open your library"
          shortcut="Mod+Shift+L"
          active={library}
          onClick={() => setLibrary(true)}
        >
          <LayersIcon size={18} />
        </Round>
        <Round
          label="Saved verses"
          shortcut="Mod+B"
          active={panel === 'saved'}
          onClick={() => setPanel(panel === 'saved' ? null : 'saved')}
        >
          <BookmarkIcon size={18} />
        </Round>

        <Menu books={all} progress={progress} />
      </header>

      {/* Positioned, because on a narrow window the side panel covers this area
          rather than sitting beside it. */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
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
                ) : beside ? (
                  <Parallel
                    book={book}
                    number={number}
                    left={edition}
                    right={beside}
                    verses={verses}
                    selected={selected}
                    onSelect={setSelected}
                  />
                ) : (
                  <div
                    className="reading selectable"
                    dir={current.direction}
                    style={{ fontFamily: current.font, textAlign: 'start' }}
                  >
                    {verses.map((verse) => {
                      const chosen = colourOf(book.id, number, verse.number);
                      const isSelected = selected === verse.number;
                      const beingSpoken = speech.verse === verse.number;

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
                            ref={
                              beingSpoken
                                ? (node) =>
                                    node?.scrollIntoView({ block: 'center', behavior: 'smooth' })
                                : undefined
                            }
                            style={{
                              borderRadius: 3,
                              boxDecorationBreak: 'clone',
                              WebkitBoxDecorationBreak: 'clone',
                              // The verse being read aloud is tinted so the eye can
                              // follow the voice, over any highlight already on it.
                              background: beingSpoken
                                ? 'color-mix(in srgb, var(--main-fill) 42%, transparent)'
                                : chosen
                                  ? `color-mix(in srgb, ${chosen.colour} ${HIGHLIGHT_OPACITY * 100}%, transparent)`
                                  : undefined,
                              outline: isSelected ? '2px solid var(--focus-ring)' : undefined,
                              outlineOffset: 1,
                              transition: 'background var(--dur-base) var(--ease-smooth)',
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
                                ? markUp(verse.text, bookMarks[`${number}:${verse.number}`]).map(
                                    (piece, index) =>
                                      piece.type === 'text' ? (
                                        <span key={index}>{piece.text}</span>
                                      ) : (
                                        <button
                                          key={index}
                                          onClick={(event) => {
                                            const box = event.currentTarget.getBoundingClientRect();
                                            setAnchored({
                                              ids: piece.ids,
                                              text: piece.text,
                                              x: box.left + box.width / 2,
                                              y: box.bottom,
                                            });
                                          }}
                                          style={{
                                            font: 'inherit',
                                            color:
                                              piece.kind === 'place'
                                                ? 'var(--mark-place)'
                                                : 'var(--mark-name)',
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
          books={all}
          chapter={number}
          verse={selected}
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
                  onClick={() => mark(book.id, number, selected, pick.index)}
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
                onClick={() => clear(book.id, number, selected)}
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

      <AnimatePresence>
        {listening && (
          <ListenBar
            speech={speech}
            verses={verses}
            edition={edition}
            bookName={book.name}
            chapter={number}
            onClose={() => setListening(false)}
          />
        )}
      </AnimatePresence>

      <Library
        open={library}
        books={all}
        onClose={() => setLibrary(false)}
        onGo={(bookId, chapterNumber, verse) => {
          const target = all.find((candidate) => candidate.id === bookId);
          if (!target) return;
          setBook(target);
          setNumber(chapterNumber);
          setShowIntro(false);
          if (verse) setSelected(verse);
        }}
      />

      <CommandPalette
        open={palette}
        commands={commands}
        books={all}
        edition={edition}
        onClose={() => setPalette(false)}
        onGoTo={(chosen, chapterNumber, verse) => {
          setBook(chosen);
          setNumber(chapterNumber);
          setShowIntro(false);
          if (verse) setSelected(verse);
        }}
        onGoToHit={(hit) => {
          const target = all.find((candidate) => candidate.id === hit.bookId);
          if (target) {
            setBook(target);
            setNumber(hit.chapter);
            setShowIntro(false);
            setSelected(hit.verse);
          }
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

      <MarkPopover
        anchored={anchored}
        onClose={() => setAnchored(null)}
        onOpenVerse={(bookId, chapterNumber) => {
          const target = all.find((candidate) => candidate.id === bookId);
          if (target) goTo({ book: target, chapter: chapterNumber });
          setAnchored(null);
        }}
      />

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

/** A button inside a grouped cluster: square, no outline, lit when its panel is open. */
function Grouped({
  label,
  shortcut,
  active,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tip label={label} shortcut={shortcut}>
      <motion.button
        whileTap={{ scale: 0.95 }}
        transition={spring.snappy}
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          display: 'grid',
          placeItems: 'center',
          color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
          background: active ? 'var(--bg-card)' : 'transparent',
          boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        {children}
      </motion.button>
    </Tip>
  );
}

function Round({
  label,
  shortcut,
  disabled,
  active,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const button = (
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

  // A disabled control gets no tooltip: there is nothing to explain about a chapter
  // before Genesis 1.
  return disabled ? (
    button
  ) : (
    <Tip label={label} shortcut={shortcut}>
      {button}
    </Tip>
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
        whiteSpace: 'nowrap',
        flex: 'none',
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
