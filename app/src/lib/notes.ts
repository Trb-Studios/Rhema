/**
 * The notepad.
 *
 * One note per chapter, saved as you type. Kept on this device for now; it moves to the
 * person's account once sign-in lands. Saving is debounced so a long note is not written
 * on every keystroke.
 *
 * Notes go through the shared store rather than a copy held in the component. The copy
 * was actively dangerous: it was read once when the panel mounted and written back
 * whole whenever the window closed, so anything that changed notes afterwards — a
 * restored backup, a second window — was silently overwritten with the stale copy on
 * the way out. Writing one chapter's note at a time into the shared value cannot do
 * that.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createStore, useStore } from './store';

type Notes = Record<string, string>;

const store = createStore<Notes>('rhema.notes', {});

export function useNotes(bookId: number, chapter: number) {
  const key = `${bookId}:${chapter}`;
  const [notes, setNotes] = useStore(store);

  // What is in the box right now. It leads the stored value while typing, so a long
  // note is not written on every keystroke.
  const [draft, setDraft] = useState(() => notes[key] ?? '');
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<{ key: string; text: string } | null>(null);

  const commit = useCallback(() => {
    window.clearTimeout(timer.current);
    const waiting = pending.current;
    if (!waiting) return;
    pending.current = null;
    setNotes((current) => {
      if (current[waiting.key] === waiting.text) return current;
      const next = { ...current, [waiting.key]: waiting.text };
      // An emptied note is removed rather than kept as a blank entry.
      if (!waiting.text.trim()) delete next[waiting.key];
      return next;
    });
  }, [setNotes]);

  // Moving to another chapter writes what was being typed before swapping the box.
  useEffect(() => {
    commit();
    setDraft(store.get()[key] ?? '');
  }, [key, commit]);

  const write = useCallback(
    (next: string) => {
      setDraft(next);
      pending.current = { key, text: next };
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(commit, 400);
    },
    [key, commit],
  );

  // A note half-typed when the window closes should still be kept.
  useEffect(() => {
    window.addEventListener('beforeunload', commit);
    return () => {
      window.removeEventListener('beforeunload', commit);
      commit();
    };
  }, [commit]);

  /** Chapters that have a note, for showing where you have written something. */
  const written = useCallback(
    () => Object.values(notes).filter((value) => value.trim()).length,
    [notes],
  );

  return { text: draft, write, written };
}

/**
 * Every note, for anything listing them rather than editing one.
 *
 * Reads the same store the notepad writes, so the library sees a note the moment it is
 * typed rather than a copy taken when it opened.
 */
export function useNoteIndex(): Record<string, string> {
  const [notes] = useStore(store);
  return notes;
}
