/**
 * The notepad.
 *
 * One note per chapter, saved as you type. Kept on this device for now; it moves to the
 * person's account once sign-in lands. Saving is debounced so a long note is not written
 * on every keystroke.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const KEY = 'rhema.notes';

type Notes = Record<string, string>;

function load(): Notes {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Notes;
  } catch {
    return {};
  }
}

function save(notes: Notes) {
  try {
    localStorage.setItem(KEY, JSON.stringify(notes));
  } catch {
    // Not being able to save is not worth interrupting a reading session over.
  }
}

export function useNotes(bookId: number, chapter: number) {
  const key = `${bookId}:${chapter}`;
  const all = useRef<Notes>(load());
  const [text, setText] = useState(() => all.current[key] ?? '');
  const timer = useRef<number | undefined>(undefined);

  // Moving to another chapter swaps in that chapter's note.
  useEffect(() => {
    setText(all.current[key] ?? '');
  }, [key]);

  const write = useCallback(
    (next: string) => {
      setText(next);
      all.current[key] = next;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => save(all.current), 400);
    },
    [key],
  );

  // A note half-typed when the window closes should still be kept.
  useEffect(() => {
    const flush = () => save(all.current);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, []);

  /** Chapters that have a note, for showing where you have written something. */
  const written = useCallback(
    () => Object.entries(all.current).filter(([, value]) => value.trim()).length,
    [],
  );

  return { text, write, written };
}
