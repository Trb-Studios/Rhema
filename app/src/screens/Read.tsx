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
import { marksFor } from '../lib/marks';
import type { BookMarks } from '../lib/marks';
import { useProgress } from '../lib/progress';
import { useSaved } from '../lib/saved';
import { useSettings } from '../lib/settings';
import { QUICK_PICKS, useHighlights } from '../lib/highlights';
import { pageVariants, spring, transition } from '../lib/motion';
import { BookPickerHost } from '../components/BookPicker';
import { MarkPopover } from '../components/MarkPopover';
import type { Anchored } from '../components/MarkPopover';
import { BookIntro } from '../components/BookIntro';
import { SidePanel } from '../components/SidePanel';
import type { PanelTab } from '../components/SidePanel';
import { SearchSheet } from '../components/SearchSheet';
import { Tip } from '../components/Tip';
import { Parallel } from '../components/Parallel';
import { ListenBar } from '../components/ListenBar';
import { Library } from '../components/Library';
import { useSpeech } from '../lib/speech';
import { ColumnsIcon, SpeakerIcon, CopyIcon } from '../components/Icons';
import { copy as toClipboard, format as formatVerse } from '../lib/copy';
import { matches, registerCommands } from '../lib/commands';
import type { Command } from '../lib/commands';
import type { Route } from '../lib/nav';
import {
  navigate,
  noteRecentBook,
  openPalette,
  replaceRoute,
  setReaderEdition,
} from '../lib/nav';
import { WordPopover } from '../components/WordPopover';
import { Review } from '../components/Review';
import { Plan } from '../components/Plan';
import { useReview } from '../lib/review';
import type { WordAnchor } from '../components/WordPopover';
import { loadLexicon, wordsForBook } from '../lib/words';
import { usePhrases } from '../lib/phrases';
import { addSticky } from '../lib/stickies';
import { OriginalText } from '../components/OriginalText';
import { KjvText } from '../components/KjvText';
import type { TextSelection } from '../components/KjvText';
import { GlossTip, useGlossHover } from '../components/GlossTip';
import { HighlightBar } from '../components/HighlightBar';
import { SlidingHighlight } from '../components/SlidingHighlight';
import type { BarTarget } from '../components/HighlightBar';
import type { Word } from '../lib/words';
import {
  BookIcon,
  BookmarkIcon,
  ChevronIcon,
  CheckIcon,
  HighlightIcon,
  InfoIcon,
  LinkIcon,
  SearchIcon,
  StickyIcon,
} from '../components/Icons';

export function Read({ route }: { route: Route }) {
  const onHome = useCallback(() => navigate({ screen: 'today' }), []);
  const { settings, update } = useSettings();
  const { progress, visit, toggleRead, isRead } = useProgress();
  const { saved, isSaved, toggle: toggleSaved } = useSaved();
  const { sync: syncReview } = useReview();

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
  // The other edition shown beside this one, or null for a single column.
  const [beside, setBeside] = useState<EditionId | null>(null);
  const [listening, setListening] = useState(false);
  const [library, setLibrary] = useState(false);
  // Null until a copy is attempted, then what happened, so the button says "Copied"
  // only when it actually was.
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null);
  const speech = useSpeech();
  const [reviewing, setReviewing] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [wordAnchor, setWordAnchor] = useState<WordAnchor | null>(null);
  // The words of the chapter on screen, when an original edition is open.
  const [chapterWords, setChapterWords] = useState<Record<string, Word[]> | null>(null);
  // Which individuals are named in each verse of this book, from the build.
  const [bookMarks, setBookMarks] = useState<BookMarks>({});
  const [panel, setPanel] = useState<PanelTab | null>('notes');
  const [showIntro, setShowIntro] = useState(true);
  // A verse someone asked for, until it has been scrolled to.
  const [jumpTo, setJumpTo] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Highlighting any stretch of words, and the bar that offers it.
  const { phrases, add: addPhrase, remove: removePhrase, recolour } = usePhrases();
  const [bar, setBar] = useState<BarTarget | null>(null);
  const pendingSelection = useRef<TextSelection | null>(null);
  const onSelectText = useCallback((selection: TextSelection | null) => {
    pendingSelection.current = selection;
    if (selection) setBar({ mode: 'new', text: selection.text, rect: selection.rect });
    else setBar((open) => (open?.mode === 'new' ? null : open));
  }, []);

  const editionGroup = useRef<HTMLDivElement>(null);

  // The English under each verse when reading an original, and the hover meanings.
  const [english, setEnglish] = useState<Verse[] | null>(null);
  const gloss = useGlossHover();

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

  // A request from elsewhere — the palette, a person's card, the start page — to open
  // a passage or a sheet. Acted on once per request, which is what the nonce is for.
  useEffect(() => {
    if (all.length === 0) return;
    if (route.bookId) {
      const target = all.find((candidate) => candidate.id === route.bookId);
      if (target) {
        setBook(target);
        setNumber(Math.min(Math.max(1, route.chapter ?? 1), target.chapters));
        setEdition('kjv');
        setShowIntro(route.verse === undefined && (route.chapter ?? 1) === 1);
        if (route.verse !== undefined) setJumpTo(route.verse);
      }
    }
    if (route.sheet === 'review') setReviewing(true);
    if (route.sheet === 'library') setLibrary(true);
    if (route.sheet === 'plan') setPlanning(true);
    if (route.sheet) setShowIntro(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.nonce, all.length]);

  // A sheet closing hands the sidebar back to the reader itself.
  const closeSheet = useCallback((close: () => void) => {
    close();
    if (route.sheet) replaceRoute({ screen: 'read' });
  }, [route.sheet]);

  useEffect(() => {
    if (book) noteRecentBook(book.id);
  }, [book]);

  useEffect(() => {
    setReaderEdition(edition);
  }, [edition]);

  // Scroll to the verse the start page asked for, once the chapter is on the page.
  // Cleared immediately afterwards, so scrolling away does not snap back.
  useEffect(() => {
    if (jumpTo === null || verses.length === 0) return;
    const element = document.getElementById(`verse-${jumpTo}`);
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    // Selected as well as centred, so it is obvious which verse was asked for.
    setSelected(jumpTo);
    setJumpTo(null);
  }, [jumpTo, verses]);

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
    // Only the latest request may fill the page. Moving quickly — or arriving from the
    // palette while the last chapter is still loading — would otherwise let a slower,
    // older chapter land on top of the one asked for.
    let live = true;
    setSelected(null);
    setAnchored(null);
    loadChapter(book, number, edition)
      .then((found) => live && setVerses(found))
      .catch((cause: Error) => live && setError(cause.message));
    if (edition === 'kjv') visit(book.id, number);

    setWordAnchor(null);
    setBar(null);
    gloss.clear();
    if (edition === 'kjv') {
      setChapterWords(null);
      setEnglish(null);
    } else {
      void loadLexicon();
      void wordsForBook(edition, book.id).then((found) => live && setChapterWords(found));
      void loadChapter(book, number, 'kjv').then((found) => live && setEnglish(found));
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, number, edition, visit]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => setCopied(null), [selected]);

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
  const anyOverlay = library || picking || searching || reviewing || planning;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
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
      ['notes', 'Sticky notes for this book', 'Mod+J', 'write sticky note pin'],
      ['notebook', 'Notebook beside the text', 'Mod+Shift+J', 'write journal notebook'],
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
        id: 'home',
        title: 'Back to today',
        hint: 'The verse of the day, where you stopped, and the year so far',
        group: 'Read',
        shortcut: 'Mod+Shift+H',
        keywords: 'start home today portal',
        run: () => onHome?.(),
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
        title: book ? `Quiz me on ${book.name}` : 'Quiz me on this book',
        hint: 'Flashcards, or a quiz at three levels',
        group: 'Study',
        shortcut: 'Mod+Q',
        keywords: 'test questions game flashcards',
        run: () => navigate({ screen: 'quiz', quizBook: book?.id }),
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
        id: 'original-english',
        title: settings.originalEnglish
          ? 'Hide the English under the Hebrew and Greek'
          : 'Show the English under the Hebrew and Greek',
        group: 'View',
        keywords: 'interlinear translation original greek hebrew english gloss',
        on: settings.originalEnglish,
        run: () => update('originalEnglish', !settings.originalEnglish),
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
    settings.size,
    settings.verseNumbers,
    settings.originalEnglish,
    update,
    isRead,
    toggleRead,
    beside,
    listening,
    speech,
    library,
    onHome,
  ]);

  commandsRef.current = commands;

  // The palette offers these while the reader is on screen, and only then.
  useEffect(() => {
    registerCommands(commands);
  }, [commands]);
  useEffect(() => () => registerCommands([]), []);

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
          gap: 4,
          padding: '0 10px 0 12px',
          height: 'var(--topbar-height)',
          flex: 'none',
          borderBottom: '1px solid var(--line-default)',
          background: 'var(--bg-page)',
          // Narrow windows scroll the header sideways rather than wrapping it into
          // two rows, which pushed the text down and broke every label in half.
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
        }}
      >
        <Round
          label="Previous chapter"
          shortcut="←"
          disabled={!previous}
          onClick={() => goTo(previous)}
        >
          <ChevronIcon dir="left" size={17} />
        </Round>
        <Round label="Next chapter" shortcut="→" disabled={!next} onClick={() => goTo(next)}>
          <ChevronIcon dir="right" size={17} />
        </Round>

        {/* Breadcrumb: the book, then the chapter. Either opens the picker. */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={spring.snappy}
          onClick={() => setPicking(true)}
          aria-label={`Reading ${book.name} ${number}. Choose another book or chapter.`}
          className="row-hover"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            height: 30,
            padding: '0 10px',
            marginLeft: 4,
            borderRadius: 7,
            whiteSpace: 'nowrap',
            fontSize: 13,
          }}
        >
          <span style={{ color: 'var(--text-tan)', display: 'grid' }}>
            <BookIcon size={15} />
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>{book.name}</span>
          <span style={{ color: 'var(--text-faint)' }}>›</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={number}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={spring.snappy}
              className="tabular"
              style={{ fontWeight: 600 }}
            >
              Chapter {number}
            </motion.span>
          </AnimatePresence>
          <ChevronIcon dir="down" size={13} />
        </motion.button>

        {available.length > 1 && (
          <div
            ref={editionGroup}
            role="group"
            aria-label="Edition"
            style={{
              position: 'relative',
              display: 'flex',
              gap: 2,
              marginLeft: 8,
              padding: 2,
              borderRadius: 8,
              background: 'var(--bg-sunken)',
              border: '1px solid var(--line-default)',
            }}
          >
            <SlidingHighlight
              container={editionGroup}
              activeKey={`${edition}:${available.length}`}
              style={{
                borderRadius: 6,
                background: 'var(--bg-selected)',
                boxShadow: 'inset 0 1px 0 var(--glass-highlight), 0 1px 2px rgba(0,0,0,0.25)',
              }}
            />
            {available.map((option) => (
              <button
                key={option.id}
                data-active={edition === option.id}
                onClick={() => setEdition(option.id)}
                aria-pressed={edition === option.id}
                title={option.title}
                style={{
                  position: 'relative',
                  height: 24,
                  padding: '0 11px',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 12,
                  color: edition === option.id ? 'var(--text-primary)' : 'var(--text-faint)',
                  transition: 'color var(--dur-fast) var(--ease-smooth)',
                }}
              >
                <span style={{ position: 'relative' }}>{option.label}</span>
              </button>
            ))}
          </div>
        )}

        <span style={{ flex: 1, minWidth: 12 }} />

        {speech.supported && (
          <Round
            label={listening ? 'Stop listening' : 'Read this chapter aloud'}
            active={listening}
            onClick={() => {
              if (listening) speech.stop();
              setListening(!listening);
            }}
          >
            <SpeakerIcon size={17} />
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
            <ColumnsIcon size={17} />
          </Round>
        )}

        <Divider />

        <Pill
          active={read}
          onClick={() => toggleRead(book.id, number)}
          label={read ? 'Read' : 'Mark read'}
        >
          <CheckIcon size={14} />
        </Pill>

        <Divider />

        <Round
          label="Sticky notes for this book"
          shortcut="Mod+J"
          active={panel === 'notes'}
          onClick={() => setPanel(panel === 'notes' ? null : 'notes')}
        >
          <StickyIcon size={17} />
        </Round>
        <Round
          label="Cross-references"
          shortcut="Mod+L"
          active={panel === 'refs'}
          onClick={() => setPanel(panel === 'refs' ? null : 'refs')}
        >
          <LinkIcon size={17} />
        </Round>
        <Round
          label="Saved verses"
          shortcut="Mod+B"
          active={panel === 'saved'}
          onClick={() => setPanel(panel === 'saved' ? null : 'saved')}
        >
          <BookmarkIcon size={17} />
        </Round>
        <Round label="Search everything" shortcut="Mod+K" onClick={openPalette}>
          <SearchIcon size={17} />
        </Round>
      </header>

      {/* Positioned, because on a narrow window the side panel covers this area
          rather than sitting beside it. */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        <div
          style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}
          onScroll={() => {
            // Floating cards are placed against the page as it was; once it moves they
            // would point at the wrong words.
            if (gloss.target) gloss.clear();
            if (bar?.mode === 'edit') setBar(null);
          }}
        >
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
                ) : edition !== 'kjv' ? (
                  <OriginalText
                    book={book}
                    number={number}
                    edition={current}
                    verses={verses}
                    words={chapterWords}
                    english={english}
                    showEnglish={settings.originalEnglish}
                    verseNumbers={settings.verseNumbers}
                    selected={selected}
                    spoken={speech.verse}
                    colourOf={colourOf}
                    onSelect={setSelected}
                    onWordEnter={(word, element) => gloss.enter(word, edition, element)}
                    onWordLeave={gloss.leave}
                    onWordClick={(word, element) => {
                      gloss.clear();
                      const box = element.getBoundingClientRect();
                      setWordAnchor({
                        word,
                        edition,
                        bookId: book.id,
                        book: book.name,
                        x: box.left + box.width / 2,
                        y: box.bottom,
                      });
                    }}
                  />
                ) : (
                  <KjvText
                    book={book}
                    number={number}
                    verses={verses}
                    marks={bookMarks}
                    phrases={phrases}
                    verseNumbers={settings.verseNumbers}
                    selected={selected}
                    spoken={speech.verse}
                    colourOf={colourOf}
                    onSelectVerse={setSelected}
                    onMark={setAnchored}
                    onSelectText={onSelectText}
                    onPhrase={(id, rect) => {
                      const phrase = phrases.find((candidate) => candidate.id === id);
                      if (!phrase) return;
                      setBar({
                        mode: 'edit',
                        id,
                        text: phrase.text,
                        colour: phrase.colour,
                        rect: { left: rect.left, top: rect.top, width: rect.width, bottom: rect.bottom },
                      });
                    }}
                  />
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
          onOpenVerse={(bookId, chapterNumber, verseNumber) => {
            const target = all.find((candidate) => candidate.id === bookId);
            if (!target) return;
            if (target.id === book.id && chapterNumber === number) {
              if (verseNumber) setJumpTo(verseNumber);
              return;
            }
            goTo({ book: target, chapter: chapterNumber });
            if (verseNumber) {
              setShowIntro(false);
              setJumpTo(verseNumber);
            }
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
            className="glass"
            style={{
              position: 'absolute',
              left: 16,
              right: panel ? 408 : 16,
              bottom: 20,
              width: 'fit-content',
              maxWidth: `calc(100% - ${panel ? 424 : 32}px)`,
              margin: '0 auto',
              zIndex: 20,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '8px 10px 8px 16px',
              borderRadius: 14,
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
              onClick={async () => {
                const worked = await toClipboard(
                  formatVerse(
                    {
                      book: book.name,
                      chapter: number,
                      verse: selected,
                      text: selectedVerse.text,
                    },
                    current,
                  ),
                );
                setCopied(worked ? 'yes' : 'no');
              }}
              aria-label={`Copy ${book.name} ${number}:${selected}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 13,
                background: 'var(--bg-sunken)',
                color: copied === 'no' ? 'var(--mark-place)' : 'var(--text-primary)',
              }}
            >
              <CopyIcon size={15} />
              {copied === 'yes' ? 'Copied' : copied === 'no' ? 'Could not copy' : 'Copy'}
            </motion.button>

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

      <Review open={reviewing} onClose={() => closeSheet(() => setReviewing(false))} />

      <Plan
        open={planning}
        onClose={() => closeSheet(() => setPlanning(false))}
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
        onClose={() => closeSheet(() => setLibrary(false))}
        onGo={(bookId, chapterNumber, verse) => {
          const target = all.find((candidate) => candidate.id === bookId);
          if (!target) return;
          setBook(target);
          setNumber(chapterNumber);
          setShowIntro(false);
          if (verse) setSelected(verse);
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

      <GlossTip target={gloss.target} />

      <HighlightBar
        target={bar}
        onClose={() => setBar(null)}
        onColour={(index) => {
          const selection = pendingSelection.current;
          if (bar?.mode === 'new' && selection) {
            addPhrase({
              bookId: book.id,
              chapter: number,
              from: selection.from,
              to: selection.to,
              colour: index,
              text: selection.text,
            });
            window.getSelection()?.removeAllRanges();
            pendingSelection.current = null;
          } else if (bar?.mode === 'edit') {
            recolour(bar.id, index);
          }
          setBar(null);
        }}
        onRemove={() => {
          if (bar?.mode === 'edit') removePhrase(bar.id);
          setBar(null);
        }}
        onSticky={() => {
          const from =
            bar?.mode === 'new'
              ? pendingSelection.current?.from.verse
              : phrases.find((phrase) => bar?.mode === 'edit' && phrase.id === bar.id)?.from.verse;
          addSticky(book.id, { anchor: { chapter: number, verse: from, quote: bar?.text } });
          window.getSelection()?.removeAllRanges();
          setPanel('notes');
          setBar(null);
        }}
        onCopy={() => {
          if (!bar) return;
          const verse =
            bar.mode === 'new'
              ? pendingSelection.current?.from.verse
              : phrases.find((phrase) => phrase.id === bar.id)?.from.verse;
          void toClipboard(`“${bar.text}” (${book.name} ${number}${verse ? `:${verse}` : ''})`);
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

/** A hairline between groups of header controls. */
function Divider() {
  return (
    <span
      aria-hidden="true"
      style={{ width: 1, height: 18, margin: '0 6px', background: 'var(--line-default)' }}
    />
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
      whileTap={disabled ? undefined : { scale: 0.9 }}
      transition={spring.snappy}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={active || disabled ? undefined : 'row-hover'}
      style={{
        width: 30,
        height: 30,
        borderRadius: 7,
        display: 'grid',
        placeItems: 'center',
        color: active ? 'var(--text-tan)' : 'var(--text-secondary)',
        background: active ? 'var(--bg-selected)' : 'transparent',
        boxShadow: active ? 'inset 0 1px 0 var(--glass-highlight)' : 'none',
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
        height: 28,
        padding: '0 11px',
        borderRadius: 7,
        fontWeight: 600,
        fontSize: 12.5,
        whiteSpace: 'nowrap',
        flex: 'none',
        background: active ? 'var(--good-tint)' : 'transparent',
        color: active ? 'var(--good)' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'color-mix(in srgb, var(--good) 35%, transparent)' : 'var(--line-default)'}`,
        transition: 'background var(--dur-fast), color var(--dur-fast), border-color var(--dur-fast)',
      }}
    >
      {children}
      {label}
    </motion.button>
  );
}
