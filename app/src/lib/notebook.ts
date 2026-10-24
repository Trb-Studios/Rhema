/**
 * The notebook: one running document for the whole Bible.
 *
 * Notes used to be one per chapter, which meant turning the page emptied the box and a
 * thought that ran across chapters had nowhere to live. The notebook is a single place
 * to write that stays put whatever is open, with the passage you were reading a click
 * away from being dropped in as a heading.
 *
 * Saving is debounced so a long session is not written on every keystroke, and a note
 * half typed when the window closes is still kept.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createStore, useStore } from './store';
import type { Book } from './bible';

export type NotebookDoc = { text: string; updated: string };

const store = createStore<NotebookDoc>('rhema.notebook', { text: '', updated: '' });

export function notebookStore() {
  return store;
}

export function useNotebook() {
  const [doc, setDoc] = useStore(store);
  const [draft, setDraft] = useState(doc.text);
  const pending = useRef<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const commit = useCallback(() => {
    window.clearTimeout(timer.current);
    const text = pending.current;
    if (text === null) return;
    pending.current = null;
    setDoc((current) =>
      current.text === text ? current : { text, updated: new Date().toISOString() },
    );
  }, [setDoc]);

  // Another view of the same notebook — the panel and the full screen — writing it.
  useEffect(() => {
    if (pending.current === null) setDraft(doc.text);
  }, [doc.text]);

  const write = useCallback(
    (next: string) => {
      setDraft(next);
      pending.current = next;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(commit, 350);
    },
    [commit],
  );

  useEffect(() => {
    window.addEventListener('beforeunload', commit);
    return () => {
      window.removeEventListener('beforeunload', commit);
      commit();
    };
  }, [commit]);

  return { text: draft, write, updated: doc.updated, commit };
}

const MIGRATED = 'rhema.notebook-migrated';

/**
 * Carries the old per-chapter notes into the notebook, once.
 *
 * Each becomes a section headed with its chapter, in Bible order, appended after
 * anything already written, so nothing anyone wrote before the notebook existed is lost.
 * The old notes are left where they were as well, so a backup made earlier still
 * restores cleanly.
 */
export function migrateChapterNotes(books: Book[]) {
  try {
    if (localStorage.getItem(MIGRATED)) return;
    const raw = localStorage.getItem('rhema.notes');
    const old = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    const entries = Object.entries(old)
      .filter(([, text]) => text.trim())
      .map(([key, text]) => {
        const [bookId, chapter] = key.split(':').map(Number);
        return { bookId, chapter, text: text.trim() };
      })
      .sort((a, b) => a.bookId - b.bookId || a.chapter - b.chapter);

    if (entries.length > 0) {
      const sections = entries.map(({ bookId, chapter, text }) => {
        const name = books.find((book) => book.id === bookId)?.name ?? `Book ${bookId}`;
        return `## ${name} ${chapter}\n${text}`;
      });
      store.set((current) => ({
        text: [current.text.trim(), ...sections].filter(Boolean).join('\n\n') + '\n',
        updated: new Date().toISOString(),
      }));
    }
    localStorage.setItem(MIGRATED, '1');
  } catch {
    // Storage unavailable: nothing to migrate from either.
  }
}

/** Headings in the notebook, for its outline: lines that start with "#". */
export function outlineOf(text: string): Array<{ title: string; at: number; level: number }> {
  const out: Array<{ title: string; at: number; level: number }> = [];
  let at = 0;
  for (const line of text.split('\n')) {
    const match = /^(#{1,3})\s+(.+)$/.exec(line);
    if (match) out.push({ title: match[2].trim(), at, level: match[1].length });
    at += line.length + 1;
  }
  return out;
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
