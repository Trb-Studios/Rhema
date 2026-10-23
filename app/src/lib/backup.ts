/**
 * Backup and restore.
 *
 * Everything the reader makes — notes, highlights, saved verses, what has been read,
 * what is in review — is kept on this device. That is fine until the machine is
 * replaced or Windows is reinstalled, at which point years of marginal notes are gone
 * with no warning and no way back. Until sign-in lands and this syncs to an account,
 * a file the person keeps themselves is the honest answer.
 *
 * The file is plain JSON with every key named, so it can be read, diffed and repaired
 * in any text editor rather than being an opaque blob that only this app understands.
 */

import { inDesktopApp, invokeCommand } from './tauri';
import { today } from './dates';

/** Every key the app owns. Anything not listed here is not backed up. */
export const KEYS = [
  'rhema.notes',
  'rhema.highlights',
  'rhema.saved',
  'rhema.progress',
  'rhema.review',
  'rhema.plan',
  'rhema.settings',
] as const;

export type Backup = {
  /** The format, so a future version can migrate an older file rather than refuse it. */
  format: 1;
  app: 'Rhema';
  savedAt: string;
  data: Record<string, unknown>;
};

export type Counts = {
  notes: number;
  highlights: number;
  saved: number;
  chaptersRead: number;
  inReview: number;
};

function readKey(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function collect(): Backup {
  const data: Record<string, unknown> = {};
  for (const key of KEYS) {
    const value = readKey(key);
    if (value !== undefined) data[key] = value;
  }
  return { format: 1, app: 'Rhema', savedAt: new Date().toISOString(), data };
}

/** What is in a backup, in the terms the reader thinks in rather than key names. */
export function countsOf(backup: Backup): Counts {
  const data = backup.data ?? {};
  const size = (value: unknown) =>
    Array.isArray(value)
      ? value.length
      : value && typeof value === 'object'
        ? Object.keys(value as object).length
        : 0;

  const progress = data['rhema.progress'] as { read?: unknown[] } | undefined;

  return {
    notes: size(data['rhema.notes']),
    highlights: size(data['rhema.highlights']),
    saved: size(data['rhema.saved']),
    chaptersRead: Array.isArray(progress?.read) ? progress!.read!.length : 0,
    inReview: size(data['rhema.review']),
  };
}

/**
 * Checks a file really is a Rhema backup before anything is overwritten.
 *
 * Restoring the wrong file would silently replace everything, so this refuses anything
 * that is not recognisably ours rather than doing its best with it.
 */
export function parse(text: string): Backup {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('That file is not readable as JSON.');
  }

  const backup = value as Partial<Backup>;
  if (!backup || typeof backup !== 'object' || backup.app !== 'Rhema' || !backup.data) {
    throw new Error('That does not look like a Rhema backup.');
  }
  if (backup.format !== 1) {
    throw new Error(
      `That backup is in format ${String(backup.format)}, which this version cannot read.`,
    );
  }
  return backup as Backup;
}

/**
 * Puts a backup back.
 *
 * `replace` is what a new machine wants: the file becomes the whole state. `merge` is
 * for bringing two devices together — notes, highlights and saved verses are combined,
 * and where both have a note for the same chapter the longer one wins, on the grounds
 * that it is more likely to be the one with work in it.
 */
export function apply(backup: Backup, mode: 'replace' | 'merge') {
  for (const key of KEYS) {
    const incoming = backup.data[key];
    if (incoming === undefined) continue;

    if (mode === 'replace') {
      localStorage.setItem(key, JSON.stringify(incoming));
      continue;
    }

    const current = readKey(key);
    localStorage.setItem(key, JSON.stringify(merge(key, current, incoming)));
  }
}

function merge(key: string, current: unknown, incoming: unknown): unknown {
  if (current === undefined) return incoming;

  if (key === 'rhema.notes') {
    const a = (current ?? {}) as Record<string, string>;
    const b = (incoming ?? {}) as Record<string, string>;
    const out: Record<string, string> = { ...a };
    for (const [chapter, note] of Object.entries(b)) {
      const mine = out[chapter] ?? '';
      if (note && note.length > mine.length) out[chapter] = note;
    }
    return out;
  }

  if (key === 'rhema.highlights') {
    return { ...(incoming as object), ...(current as object) };
  }

  if (key === 'rhema.saved') {
    const a = (Array.isArray(current) ? current : []) as { [k: string]: unknown }[];
    const b = (Array.isArray(incoming) ? incoming : []) as { [k: string]: unknown }[];
    const id = (verse: { [k: string]: unknown }) =>
      `${verse.bookId}:${verse.chapter}:${verse.verse}`;
    const seen = new Set(a.map(id));
    return [...a, ...b.filter((verse) => !seen.has(id(verse)))];
  }

  if (key === 'rhema.progress') {
    const a = (current ?? {}) as { read?: string[]; days?: string[]; last?: unknown };
    const b = (incoming ?? {}) as { read?: string[]; days?: string[]; last?: unknown };
    return {
      read: [...new Set([...(a.read ?? []), ...(b.read ?? [])])],
      days: [...new Set([...(a.days ?? []), ...(b.days ?? [])])],
      last: a.last ?? b.last ?? null,
    };
  }

  if (key === 'rhema.review') {
    // Cards that exist in both keep whichever is due sooner, so merging never loses a
    // verse that was about to come up.
    const a = (current ?? {}) as Record<string, { due?: string }>;
    const b = (incoming ?? {}) as Record<string, { due?: string }>;
    const out = { ...a };
    for (const [id, card] of Object.entries(b)) {
      const mine = out[id];
      if (!mine || (card.due ?? '') < (mine.due ?? '')) out[id] = card;
    }
    return out;
  }

  // Settings and the plan are single values: what is already here wins, because the
  // person set it on this machine.
  return current;
}

export function suggestedName(): string {
  return `rhema-backup-${today()}.json`;
}

/**
 * Writes the backup where the person asks.
 *
 * In the desktop app that is the system save dialog and a real file. On the web build
 * it is an ordinary download, which is the only thing a browser allows.
 */
export async function save(backup: Backup): Promise<string | null> {
  const text = JSON.stringify(backup, null, 2);

  if (inDesktopApp()) {
    const { save: pick } = await import('@tauri-apps/plugin-dialog');
    const path = await pick({
      defaultPath: suggestedName(),
      filters: [{ name: 'Rhema backup', extensions: ['json'] }],
    });
    if (!path) return null;
    await invokeCommand('save_backup', { path, contents: text });
    return path;
  }

  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking at once can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return suggestedName();
}

/** Asks for a backup file and returns what is in it, or null if nothing was chosen. */
export async function load(): Promise<Backup | null> {
  if (inDesktopApp()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const path = await open({
      multiple: false,
      filters: [{ name: 'Rhema backup', extensions: ['json'] }],
    });
    if (typeof path !== 'string') return null;
    const text = await invokeCommand<string>('open_backup', { path });
    return parse(text ?? '');
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        resolve(parse(await file.text()));
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}
