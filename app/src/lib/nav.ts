/**
 * Where the app is, and requests to go somewhere else.
 *
 * The sidebar, the command palette, a name card in the reader and the start page all
 * send people places. They do it by writing a route here rather than by passing
 * callbacks down through every screen, so a person card can open a verse in the reader
 * without knowing how the reader is wired.
 *
 * A route carries a nonce. Asking for the same passage twice is two requests, and the
 * reader should act on both, so it watches the nonce rather than the passage.
 */

import { useCallback } from 'react';
import { createStore, useStore } from './store';
import type { EditionId } from './editions';

export type Screen =
  | 'today'
  | 'read'
  | 'people'
  | 'places'
  | 'quiz'
  | 'notebook'
  | 'highlights';

/** A panel or sheet the reader can be asked to open on arrival. */
export type ReaderSheet = 'review' | 'library' | 'plan';

export type Route = {
  screen: Screen;
  /** For the reader: the passage to open. Absent means wherever reading last stopped. */
  bookId?: number;
  chapter?: number;
  verse?: number;
  sheet?: ReaderSheet;
  /** For People and Places: the individual to show. */
  subject?: string;
  /** For the quiz: the book to start on. */
  quizBook?: number;
  nonce: number;
};

let counter = 0;

const routeStore = createStore<Route>('rhema.route', { screen: 'today', nonce: 0 }, false);

/** Which screens were open most recently, newest first, for Back. */
const historyStore = createStore<Route[]>('rhema.route-history', [], false);

export function navigate(next: Omit<Route, 'nonce'>) {
  const current = routeStore.get();
  historyStore.set((list) => [current, ...list].slice(0, 30));
  counter += 1;
  routeStore.set({ ...next, nonce: counter });
}

/**
 * Changes the route without making it a new request: no history entry, same nonce. For
 * a screen tidying its own route, such as a sheet closing, which nobody acts upon.
 */
export function replaceRoute(next: Omit<Route, 'nonce'>) {
  routeStore.set({ ...next, nonce: routeStore.get().nonce });
}

export function goBack() {
  const [previous, ...rest] = historyStore.get();
  if (!previous) return;
  historyStore.set(rest);
  counter += 1;
  routeStore.set({ ...previous, nonce: counter });
}

export function useRoute(): Route {
  const [route] = useStore(routeStore);
  return route;
}

export function useCanGoBack(): boolean {
  const [history] = useStore(historyStore);
  return history.length > 0;
}

/** Opening a passage is the commonest request, so it gets its own helper. */
export function useOpenPassage() {
  return useCallback((bookId: number, chapter: number, verse?: number) => {
    navigate({ screen: 'read', bookId, chapter, verse });
  }, []);
}

/** Books opened recently, for the sidebar. Kept between sessions. */
const recentStore = createStore<number[]>('rhema.recent-books', []);

export function noteRecentBook(bookId: number) {
  recentStore.set((list) => {
    if (list[0] === bookId) return list;
    return [bookId, ...list.filter((id) => id !== bookId)].slice(0, 5);
  });
}

export function useRecentBooks(): number[] {
  const [recent] = useStore(recentStore);
  return recent;
}

/** Whether the sidebar is folded down to its icons. Kept between sessions. */
const collapsedStore = createStore<boolean>('rhema.sidebar-collapsed', false);

export function useSidebarCollapsed(): [boolean, (value: boolean) => void] {
  const [collapsed, setCollapsed] = useStore(collapsedStore);
  return [collapsed, (value: boolean) => setCollapsed(value)];
}

/** The edition the reader is showing, so the palette searches the same text. */
const editionStore = createStore<EditionId>('rhema.reader-edition', 'kjv', false);

export function setReaderEdition(edition: EditionId) {
  editionStore.set(edition);
}

export function useReaderEdition(): EditionId {
  return useStore(editionStore)[0];
}

/** The palette is global: every screen opens the same one. */
const paletteStore = createStore<boolean>('rhema.palette', false, false);

export function usePalette(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useStore(paletteStore);
  return [open, (value: boolean) => setOpen(value)];
}

export function openPalette() {
  paletteStore.set(true);
}
