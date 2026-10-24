import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { UpdateBanner } from './components/UpdateBanner';
import { Sidebar } from './components/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { Read } from './screens/Read';
import { Start } from './screens/Start';
import type { Opening } from './screens/Start';
import { People } from './screens/People';
import { Places } from './screens/Places';
import { QuizScreen } from './screens/QuizScreen';
import { Notebook } from './screens/Notebook';
import { Highlights } from './screens/Highlights';
import { useSettings } from './lib/settings';
import type { Command } from './lib/commands';
import { matches } from './lib/commands';
import type { Screen } from './lib/nav';
import {
  goBack,
  navigate,
  openPalette,
  useRoute,
  useSidebarCollapsed,
} from './lib/nav';
import { transition } from './lib/motion';
import {
  BookIcon,
  HighlightIcon,
  HomeIcon,
  MoonIcon,
  NotebookIcon,
  PeopleIcon,
  PlaceIcon,
  SidebarIcon,
  TargetIcon,
} from './components/Icons';

const SCREEN_KEYS: Array<[string, Screen]> = [
  ['Mod+1', 'today'],
  ['Mod+2', 'read'],
  ['Mod+3', 'people'],
  ['Mod+4', 'places'],
  ['Mod+5', 'quiz'],
  ['Mod+6', 'notebook'],
  ['Mod+7', 'highlights'],
];

/**
 * Rhema: the Bible, and everything that helps it stay with you.
 *
 * A sidebar on the left reaches every part of the app, the screen beside it does one
 * thing at a time, and the palette reaches everything from the keyboard. Screens change
 * with a short drift and fade rather than a cut, so moving around feels like one space.
 */
export default function App() {
  // Reading settings apply to the whole document, so they are set up once here.
  const { settings, update } = useSettings();
  const route = useRoute();
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  const globalCommands: Command[] = useMemo(
    () => [
      { id: 'go-today', title: 'Today', hint: 'The verse of the day and where you stopped', group: 'Go', shortcut: 'Mod+1', icon: <HomeIcon size={15} />, keywords: 'home start', run: () => navigate({ screen: 'today' }) },
      { id: 'go-read', title: 'Read', hint: 'Back to the text where you left it', group: 'Go', shortcut: 'Mod+2', icon: <BookIcon size={15} />, keywords: 'bible text', run: () => navigate({ screen: 'read' }) },
      { id: 'go-people', title: 'People', hint: 'Everyone in Scripture, with their family and every verse', group: 'Go', shortcut: 'Mod+3', icon: <PeopleIcon size={15} />, keywords: 'names characters who', run: () => navigate({ screen: 'people' }) },
      { id: 'go-places', title: 'Places', hint: 'Where it happened, and where it is now', group: 'Go', shortcut: 'Mod+4', icon: <PlaceIcon size={15} />, keywords: 'map where geography', run: () => navigate({ screen: 'places' }) },
      { id: 'go-quiz', title: 'Quiz', hint: 'Flashcards and a three-level quiz on any book', group: 'Study', shortcut: 'Mod+5', icon: <TargetIcon size={15} />, keywords: 'test game questions flashcards', run: () => navigate({ screen: 'quiz' }) },
      { id: 'go-notebook', title: 'Notebook', hint: 'One notebook for the whole Bible', group: 'Keep', shortcut: 'Mod+6', icon: <NotebookIcon size={15} />, keywords: 'notes journal write', run: () => navigate({ screen: 'notebook' }) },
      { id: 'go-highlights', title: 'Highlights', hint: 'Every phrase and verse you have marked', group: 'Keep', shortcut: 'Mod+7', icon: <HighlightIcon size={15} />, keywords: 'marked colours', run: () => navigate({ screen: 'highlights' }) },
      { id: 'theme', title: settings.theme === 'light' ? 'Switch to dark' : 'Switch to light', group: 'View', shortcut: 'Mod+Shift+D', icon: <MoonIcon size={15} />, keywords: 'theme appearance night', run: () => update('theme', settings.theme === 'light' ? 'dark' : 'light') },
      { id: 'sidebar', title: collapsed ? 'Expand the sidebar' : 'Collapse the sidebar', group: 'View', shortcut: 'Mod+\\', icon: <SidebarIcon size={15} />, keywords: 'sidebar rail navigation', run: () => setCollapsed(!collapsed) },
    ],
    [settings.theme, update, collapsed, setCollapsed],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (matches(event, 'Mod+K')) {
        event.preventDefault();
        openPalette();
        return;
      }
      for (const [shortcut, screen] of SCREEN_KEYS) {
        if (matches(event, shortcut)) {
          event.preventDefault();
          navigate({ screen });
          return;
        }
      }
      if (matches(event, 'Mod+\\')) {
        event.preventDefault();
        setCollapsed(!collapsed);
        return;
      }
      if (matches(event, 'Mod+Shift+D')) {
        event.preventDefault();
        update('theme', settings.theme === 'light' ? 'dark' : 'light');
        return;
      }
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        goBack();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [collapsed, setCollapsed, settings.theme, update]);

  const openFromStart = (what: Opening) => {
    if ('open' in what) {
      if (what.open === 'palette') openPalette();
      else navigate({ screen: 'read', sheet: what.open });
    } else {
      navigate({ screen: 'read', bookId: what.bookId, chapter: what.chapter, verse: what.verse });
    }
  };

  return (
    // Clipped rather than hidden: an element scrolled into view can still scroll a
    // container that merely hides its overflow, which slid the whole window sideways.
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'clip' }}>
      <Sidebar />
      <main
        style={{
          position: 'relative',
          flex: 1,
          minWidth: 0,
          overflow: 'clip',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-page)',
        }}
      >
        <UpdateBanner />
        {/* The outgoing screen is lifted out of the layout and fades over the incoming
            one, rather than the incoming one waiting for it: a screen whose exit never
            finished would otherwise leave the window blank. */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={route.screen}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, pointerEvents: 'none' }}
            transition={transition('smooth')}
            style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            {route.screen === 'today' && (
              <Start onRead={() => navigate({ screen: 'read' })} onOpen={openFromStart} />
            )}
            {route.screen === 'read' && <Read route={route} />}
            {route.screen === 'people' && <People route={route} />}
            {route.screen === 'places' && <Places route={route} />}
            {route.screen === 'quiz' && <QuizScreen route={route} />}
            {route.screen === 'notebook' && <Notebook />}
            {route.screen === 'highlights' && <Highlights />}
          </motion.div>
        </AnimatePresence>
      </main>
      <CommandPalette globalCommands={globalCommands} />
    </div>
  );
}
