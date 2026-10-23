/**
 * Putting a verse on the clipboard.
 *
 * Someone copying a verse is nearly always about to paste it somewhere it has to stand
 * on its own — a message, a document, a slide — so the reference travels with it. A
 * bare sentence with no reference is the thing people then have to go back and look up.
 */

import type { Edition } from './editions';

export type Copyable = {
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

/**
 * Formats a verse for pasting.
 *
 * The edition is named because the wording is the edition's: quoting the Westminster
 * Leningrad Codex as though it were the King James would misattribute it.
 */
export function format(verse: Copyable, edition: Edition): string {
  const reference = `${verse.book} ${verse.chapter}:${verse.verse}`;
  return `${verse.text.trim()}\n— ${reference} (${edition.title})`;
}

/** Just the reference, for linking to a passage in conversation. */
export function reference(verse: Pick<Copyable, 'book' | 'chapter' | 'verse'>): string {
  return `${verse.book} ${verse.chapter}:${verse.verse}`;
}

/**
 * Copies, falling back where the clipboard is not available.
 *
 * `navigator.clipboard` needs a secure context and is refused in some embedded views,
 * so a hidden textarea and `execCommand` stand in. Returns whether it worked, so the
 * caller can say "Copied" only when it actually was.
 */
export async function copy(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Falls through to the older way rather than failing outright.
  }

  try {
    const holder = document.createElement('textarea');
    holder.value = text;
    holder.setAttribute('readonly', '');
    holder.style.position = 'fixed';
    holder.style.opacity = '0';
    document.body.appendChild(holder);
    holder.select();
    const worked = document.execCommand('copy');
    document.body.removeChild(holder);
    return worked;
  } catch {
    return false;
  }
}
