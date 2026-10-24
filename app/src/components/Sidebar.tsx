import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Book } from '../lib/bible';
import { books as loadBooks } from '../lib/bible';
import type { Screen } from '../lib/nav';
import {
  navigate,
  openPalette,
  useRecentBooks,
  useRoute,
  useSidebarCollapsed,
} from '../lib/nav';
import { useProgress, streakOf } from '../lib/progress';
import { useReview } from '../lib/review';
import { useSettings } from '../lib/settings';
import { keyLabel } from '../lib/commands';
import { spring, transition } from '../lib/motion';
import { Tip } from './Tip';
import { Menu } from './Menu';
import {
  BookIcon,
  CalendarIcon,
  FlameIcon,
  HighlightIcon,
  HomeIcon,
  LayersIcon,
  MoonIcon,
  NotebookIcon,
  PeopleIcon,
  PlaceIcon,
  ScrollIcon,
  SearchIcon,
  SidebarIcon,
  SunIcon,
  TargetIcon,
} from './Icons';

type Item = {
  id: string;
  label: string;
  icon: ReactNode;
  shortcut?: string;
  badge?: number;
  active: boolean;
  onClick: () => void;
};

/**
 * The left rail.
 *
 * Every place in the app is one click from here, grouped the way a reader thinks about
 * them: the day, the text, studying it, and what you have kept. The selected row is lit
 * by a single pill that slides between rows rather than each row lighting on its own,
 * which is what makes moving around feel continuous.
 */
export function Sidebar() {
  const route = useRoute();
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const { progress } = useProgress();
  const { dueCount } = useReview();
  const { settings, update } = useSettings();
  const recent = useRecentBooks();
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    void loadBooks()
      .then(setBooks)
      .catch(() => {});
  }, []);

  const streak = streakOf(progress.days);
  const lastBook = books.find((book) => book.id === progress.last?.bookId);
  const go = (screen: Screen) => () => navigate({ screen });

  const main: Item[] = [
    {
      id: 'today',
      label: 'Today',
      icon: <HomeIcon size={17} />,
      shortcut: 'Mod+1',
      active: route.screen === 'today',
      onClick: go('today'),
    },
    {
      id: 'read',
      label: lastBook && progress.last ? `${lastBook.name} ${progress.last.chapter}` : 'Read',
      icon: <BookIcon size={17} />,
      shortcut: 'Mod+2',
      active: route.screen === 'read' && !route.sheet,
      onClick: go('read'),
    },
  ];

  const study: Item[] = [
    {
      id: 'people',
      label: 'People',
      icon: <PeopleIcon size={17} />,
      shortcut: 'Mod+3',
      active: route.screen === 'people',
      onClick: go('people'),
    },
    {
      id: 'places',
      label: 'Places',
      icon: <PlaceIcon size={17} />,
      shortcut: 'Mod+4',
      active: route.screen === 'places',
      onClick: go('places'),
    },
    {
      id: 'quiz',
      label: 'Quiz',
      icon: <TargetIcon size={17} />,
      shortcut: 'Mod+5',
      active: route.screen === 'quiz',
      onClick: go('quiz'),
    },
    {
      id: 'review',
      label: 'Review',
      icon: <ScrollIcon size={17} />,
      badge: dueCount,
      active: route.screen === 'read' && route.sheet === 'review',
      onClick: () => navigate({ screen: 'read', sheet: 'review' }),
    },
    {
      id: 'plan',
      label: 'Reading plan',
      icon: <CalendarIcon size={17} />,
      active: route.screen === 'read' && route.sheet === 'plan',
      onClick: () => navigate({ screen: 'read', sheet: 'plan' }),
    },
  ];

  const yours: Item[] = [
    {
      id: 'notebook',
      label: 'Notebook',
      icon: <NotebookIcon size={17} />,
      shortcut: 'Mod+6',
      active: route.screen === 'notebook',
      onClick: go('notebook'),
    },
    {
      id: 'highlights',
      label: 'Highlights',
      icon: <HighlightIcon size={17} />,
      shortcut: 'Mod+7',
      active: route.screen === 'highlights',
      onClick: go('highlights'),
    },
    {
      id: 'library',
      label: 'Library',
      icon: <LayersIcon size={17} />,
      active: route.screen === 'read' && route.sheet === 'library',
      onClick: () => navigate({ screen: 'read', sheet: 'library' }),
    },
  ];

  const recentBooks = recent
    .map((id) => books.find((book) => book.id === id))
    .filter((book): book is Book => Boolean(book))
    .slice(0, 4);

  const width = collapsed ? 60 : 232;

  return (
    <motion.nav
      aria-label="Rhema"
      animate={{ width }}
      initial={false}
      transition={transition('smooth')}
      style={{
        flex: 'none',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-shell)',
        borderRight: '1px solid var(--line-default)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 5,
      }}
    >
      {/* Workspace row: the mark, the name, and the two things you reach for most. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 48,
          padding: collapsed ? '0 14px' : '0 10px 0 14px',
          flex: 'none',
        }}
      >
        <motion.button
          whileTap={{ scale: 0.92 }}
          transition={spring.snappy}
          onClick={() => navigate({ screen: 'today' })}
          aria-label="Rhema, back to today"
          style={{
            width: 24,
            height: 24,
            flex: 'none',
            borderRadius: 7,
            display: 'grid',
            placeItems: 'center',
            background:
              'linear-gradient(145deg, var(--tan-400), var(--tan-600))',
            color: 'var(--main-on)',
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 3px rgba(0,0,0,0.4)',
          }}
        >
          R
        </motion.button>
        <Fade show={!collapsed}>
          <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>Rhema</span>
        </Fade>
        <span style={{ flex: 1 }} />
        {!collapsed && (
          <>
            <Tip label="Search" shortcut="Mod+K">
              <IconButton label="Search" onClick={openPalette}>
                <SearchIcon size={16} />
              </IconButton>
            </Tip>
            <Tip label="Collapse sidebar" shortcut="Mod+\">
              <IconButton label="Collapse sidebar" onClick={() => setCollapsed(true)}>
                <SidebarIcon size={16} />
              </IconButton>
            </Tip>
          </>
        )}
      </div>

      {collapsed && (
        <div style={{ display: 'grid', gap: 2, padding: '0 10px 6px' }}>
          <Tip label="Expand sidebar" shortcut="Mod+\" side="right">
            <IconButton label="Expand sidebar" onClick={() => setCollapsed(false)} wide>
              <SidebarIcon size={17} />
            </IconButton>
          </Tip>
          <Tip label="Search" shortcut="Mod+K" side="right">
            <IconButton label="Search" onClick={openPalette} wide>
              <SearchIcon size={17} />
            </IconButton>
          </Tip>
        </div>
      )}

      {!collapsed && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          transition={spring.snappy}
          onClick={openPalette}
          className="row-hover"
          style={{
            margin: '2px 10px 10px',
            height: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 8px 0 10px',
            borderRadius: 8,
            border: '1px solid var(--line-default)',
            background: 'var(--bg-sunken)',
            color: 'var(--text-faint)',
            fontSize: 13,
          }}
        >
          <SearchIcon size={15} />
          <span style={{ flex: 1, textAlign: 'start' }}>Go to anything…</span>
          <kbd className="kbd">{keyLabel('Mod+K')}</kbd>
        </motion.button>
      )}

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 10px' }}>
        <Group items={main} collapsed={collapsed} />
        <Group title="Study" items={study} collapsed={collapsed} />
        <Group title="Yours" items={yours} collapsed={collapsed} />

        {!collapsed && recentBooks.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="eyebrow" style={{ padding: '0 8px 6px' }}>
              Recent
            </div>
            {recentBooks.map((book) => (
              <Row
                key={book.id}
                item={{
                  id: `recent-${book.id}`,
                  label: book.name,
                  icon: (
                    <span
                      style={{
                        width: 17,
                        height: 17,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: 5,
                        background: 'var(--bg-sunken)',
                        border: '1px solid var(--line-default)',
                        font: '600 8.5px var(--font-ui)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {book.abbreviation.slice(0, 2)}
                    </span>
                  ),
                  active: false,
                  onClick: () => navigate({ screen: 'read', bookId: book.id, chapter: 1 }),
                }}
                collapsed={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer: the habit at a glance, the theme, and settings. */}
      <div
        style={{
          flex: 'none',
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: 'center',
          gap: 4,
          padding: collapsed ? '10px 0' : '10px 10px 12px 14px',
          borderTop: '1px solid var(--line-faint)',
        }}
      >
        <Tip label={`${streak} day streak`} side={collapsed ? 'right' : 'top'}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              height: 28,
              padding: collapsed ? 0 : '0 9px 0 7px',
              borderRadius: 999,
              background: streak > 0 ? 'var(--status-pending-bg)' : 'transparent',
              color: streak > 0 ? 'var(--status-pending-text)' : 'var(--text-faint)',
              font: '600 12px var(--font-ui)',
            }}
            className="tabular"
          >
            <FlameIcon size={15} tint="var(--warn)" />
            {!collapsed && streak}
          </span>
        </Tip>
        {!collapsed && <span style={{ flex: 1 }} />}
        <Tip
          label={settings.theme === 'light' ? 'Switch to dark' : 'Switch to light'}
          shortcut="Mod+Shift+D"
          side={collapsed ? 'right' : 'top'}
        >
          <IconButton
            label="Toggle theme"
            onClick={() => update('theme', settings.theme === 'light' ? 'dark' : 'light')}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={settings.theme === 'light' ? 'sun' : 'moon'}
                initial={{ rotate: -60, opacity: 0, scale: 0.6 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 60, opacity: 0, scale: 0.6 }}
                transition={spring.snappy}
                style={{ display: 'grid' }}
              >
                {settings.theme === 'light' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
              </motion.span>
            </AnimatePresence>
          </IconButton>
        </Tip>
        <Menu books={books} progress={progress} placement={collapsed ? 'right' : 'up'} />
      </div>
    </motion.nav>
  );
}

function Group({
  title,
  items,
  collapsed,
}: {
  title?: string;
  items: Item[];
  collapsed: boolean;
}) {
  return (
    <div style={{ marginTop: title ? 14 : 0 }}>
      {title &&
        (collapsed ? (
          <div style={{ height: 1, background: 'var(--line-faint)', margin: '0 8px 8px' }} />
        ) : (
          <div className="eyebrow" style={{ padding: '0 8px 6px' }}>
            {title}
          </div>
        ))}
      <div style={{ display: 'grid', gap: 1 }}>
        {items.map((item) => (
          <Row key={item.id} item={item} collapsed={collapsed} />
        ))}
      </div>
    </div>
  );
}

function Row({ item, collapsed }: { item: Item; collapsed: boolean }) {
  const button = (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={spring.snappy}
      onClick={item.onClick}
      aria-current={item.active ? 'page' : undefined}
      aria-label={item.label}
      className={item.active ? undefined : 'row-hover'}
      style={{
        position: 'relative',
        width: '100%',
        height: 30,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: collapsed ? 0 : '0 8px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 7,
        color: item.active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: 13,
        fontWeight: item.active ? 600 : 500,
      }}
    >
      {item.active && (
        <motion.span
          layoutId="sidebar-pill"
          transition={spring.snappy}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 7,
            background: 'var(--bg-selected)',
            boxShadow: 'inset 0 1px 0 var(--glass-highlight)',
          }}
        />
      )}
      <span
        style={{
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          color: item.active ? 'var(--text-tan)' : 'inherit',
        }}
      >
        {item.icon}
        {collapsed && item.badge ? (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -4,
              width: 7,
              height: 7,
              borderRadius: 99,
              background: 'var(--main-fill)',
              boxShadow: '0 0 0 2px var(--bg-shell)',
            }}
          />
        ) : null}
      </span>
      {!collapsed && (
        <>
          <span
            style={{
              position: 'relative',
              flex: 1,
              textAlign: 'start',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.label}
          </span>
          {item.badge ? (
            <motion.span
              key={item.badge}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring.bouncy}
              className="tabular"
              style={{
                position: 'relative',
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                borderRadius: 99,
                display: 'grid',
                placeItems: 'center',
                background: 'var(--main-fill)',
                color: 'var(--main-on)',
                font: '700 10.5px var(--font-ui)',
              }}
            >
              {item.badge}
            </motion.span>
          ) : null}
        </>
      )}
    </motion.button>
  );

  return collapsed ? (
    <Tip label={item.label} shortcut={item.shortcut} side="right">
      {button}
    </Tip>
  ) : (
    button
  );
}

function IconButton({
  label,
  onClick,
  children,
  wide,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      transition={spring.snappy}
      onClick={onClick}
      aria-label={label}
      className="row-hover"
      style={{
        width: wide ? 40 : 28,
        height: 28,
        borderRadius: 7,
        display: 'grid',
        placeItems: 'center',
        color: 'var(--text-secondary)',
      }}
    >
      {children}
    </motion.button>
  );
}

function Fade({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -4 }}
          transition={{ duration: 0.12 }}
          style={{ whiteSpace: 'nowrap' }}
        >
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
