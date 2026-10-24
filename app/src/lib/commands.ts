/**
 * Everything the app can do, as one list.
 *
 * The command palette, the keyboard shortcuts and the header all read from here, so a
 * command cannot exist in one and be missing from another. Adding a command to this
 * file is enough for it to be reachable by keyboard, searchable by name, and listed
 * with its shortcut.
 */

import type { ReactNode } from 'react';
import { createStore, useStore } from './store';

export type CommandGroup = 'Go' | 'Read' | 'Study' | 'View' | 'Keep';

/**
 * The commands the screen on view offers, on top of the app-wide ones.
 *
 * The palette is global, but most commands belong to a screen: "Next chapter" means
 * nothing on the People page. Each screen registers its own here while it is shown, and
 * the palette lists whatever is registered.
 */
const registry = createStore<Command[]>('rhema.screen-commands', [], false);

export function registerCommands(list: Command[]) {
  registry.set(list);
}

export function useRegisteredCommands(): Command[] {
  return useStore(registry)[0];
}

export type Command = {
  id: string;
  title: string;
  /** Shown under the title, saying what the command does rather than repeating it. */
  hint?: string;
  group: CommandGroup;
  /** Displayed as a key hint, and matched against the keyboard. */
  shortcut?: string;
  icon?: ReactNode;
  /** Words that should find this command besides its title. */
  keywords?: string;
  run: () => void;
  /** Shown as a tick in the palette, for commands that toggle something. */
  on?: boolean;
  /** Left out of the palette entirely when false. */
  available?: boolean;
};

/**
 * Scores a command against what has been typed.
 *
 * A word that starts the title beats one in the middle, which beats one only in the
 * keywords, so typing "pl" offers Reading plan before Display. Returns null when the
 * command does not match at all.
 */
export function score(command: Command, query: string): number | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return 0;

  const title = command.title.toLowerCase();
  const haystack = `${title} ${command.keywords ?? ''} ${command.group}`.toLowerCase();

  if (title.startsWith(needle)) return 100;
  if (title.includes(` ${needle}`)) return 80;
  if (title.includes(needle)) return 60;
  if (haystack.includes(needle)) return 40;

  // Letters in order, so "rdpl" finds "Reading plan".
  let at = 0;
  for (const letter of needle) {
    at = title.indexOf(letter, at);
    if (at === -1) return null;
    at += 1;
  }
  return 20;
}

/** The commands that match, best first, keeping each group's own order within a score. */
export function rank(commands: Command[], query: string): Command[] {
  return commands
    .filter((command) => command.available !== false)
    .map((command, index) => ({ command, index, points: score(command, query) }))
    .filter((entry) => entry.points !== null)
    .sort((a, b) => (b.points as number) - (a.points as number) || a.index - b.index)
    .map((entry) => entry.command);
}

/**
 * Reads a reference someone typed: "john 3", "1 cor 13:4", "gen1".
 *
 * Returns the book as written and the numbers found, for the caller to match against
 * the real book list. Returns null when it does not look like a reference at all, so
 * ordinary words fall through to searching the text.
 */
export function parseReference(
  input: string,
): { book: string; chapter?: number; verse?: number } | null {
  const match = /^\s*((?:[1-3]\s*)?[A-Za-z][A-Za-z\s]*?)\s*(\d+)?\s*(?::\s*(\d+))?\s*$/.exec(input);
  if (!match) return null;

  const [, book, chapter, verse] = match;
  const name = book.trim();
  if (name.length < 2) return null;

  return {
    book: name,
    chapter: chapter ? Number(chapter) : undefined,
    verse: verse ? Number(verse) : undefined,
  };
}

/** Matches what was typed against the books, by name or by any common short form. */
export function matchBook<T extends { name: string; abbreviation: string }>(
  books: T[],
  typed: string,
): T | null {
  const needle = typed.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!needle) return null;

  const exact = books.find((book) => book.name.toLowerCase() === needle);
  if (exact) return exact;

  const abbreviation = books.find((book) => book.abbreviation.toLowerCase() === needle);
  if (abbreviation) return abbreviation;

  const starts = books.filter((book) => book.name.toLowerCase().startsWith(needle));
  if (starts.length > 0) return starts[0];

  // "1cor" for "1 Corinthians", with the space left out.
  const squashed = needle.replace(/\s/g, '');
  const squashedMatch = books.filter((book) =>
    book.name.toLowerCase().replace(/\s/g, '').startsWith(squashed),
  );
  return squashedMatch[0] ?? null;
}

/** Turns "Mod+K" into what the running platform calls it. */
export function keyLabel(shortcut: string): string {
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return shortcut
    .replace('Mod', mac ? '⌘' : 'Ctrl')
    .replace('Shift', mac ? '⇧' : 'Shift')
    .replace('Alt', mac ? '⌥' : 'Alt')
    .replace(/\+/g, mac ? '' : ' ');
}

/** Whether a key event matches a shortcut such as "Mod+K" or "G". */
export function matches(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.split('+');
  const key = parts[parts.length - 1].toLowerCase();
  const wantsMod = parts.includes('Mod');
  const wantsShift = parts.includes('Shift');

  const hasMod = event.ctrlKey || event.metaKey;
  if (wantsMod !== hasMod) return false;
  if (wantsShift !== event.shiftKey) return false;
  return event.key.toLowerCase() === key;
}
