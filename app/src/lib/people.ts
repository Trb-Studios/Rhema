/**
 * Finding people and places, and telling apart those who share a name.
 *
 * Scripture has a dozen Jameses, seven Marys and thirty Zechariahs. Searching "James"
 * should not return one profile that blends them; it should return each James with a
 * line that says which one this is: "son of Zebedee", "son of Alphaeus", "brother of
 * Jesus". The line is built from what the data knows — parents first, because that is
 * how Scripture itself distinguishes people, then a spouse, then a tribe, then the book
 * they first appear in.
 */

import type { Book } from './bible';
import type { Subject } from './marks';
import type { Profiles } from './profiles';

/**
 * Everyone, under the names a reader would look for them by. TIPNR files a few people
 * under a later name — Jacob as Israel — so where the profile knows the everyday name,
 * that is the one searched and shown.
 */
export function withEverydayNames(
  subjects: Map<string, Subject>,
  profiles: Profiles | null,
): Map<string, Subject> {
  if (!profiles) return subjects;
  const out = new Map<string, Subject>();
  for (const [id, subject] of subjects) {
    const name = profiles.people[id]?.name;
    out.set(id, name ? { ...subject, name } : subject);
  }
  return out;
}

export function fold(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/**
 * The people or places whose name matches what was typed, best first.
 *
 * A name that starts with the query beats one that only contains it, and within each the
 * individual Scripture mentions most comes first: someone typing "Ja" wants Jacob and
 * James before Jaasiel.
 */
export function searchSubjects(
  all: Iterable<Subject>,
  query: string,
  kind?: Subject['kind'],
  limit = 60,
): Subject[] {
  const needle = fold(query);
  const scored: Array<{ subject: Subject; points: number }> = [];

  for (const subject of all) {
    if (kind && subject.kind !== kind) continue;
    if (!needle) {
      scored.push({ subject, points: 0 });
      continue;
    }
    const name = fold(subject.name);
    const near = fold(subject.near ?? '');
    let points = -1;
    if (name === needle) points = 4;
    else if (name.startsWith(needle)) points = 3;
    else if (name.split(/\s+/).some((part) => part.startsWith(needle))) points = 2;
    else if (name.includes(needle)) points = 1;
    else if (near.includes(needle)) points = 0.5;
    if (points >= 0) scored.push({ subject, points });
  }

  return scored
    .sort((a, b) => b.points - a.points || b.subject.total - a.subject.total)
    .slice(0, limit)
    .map((entry) => entry.subject);
}

/** Every individual sharing a name, most mentioned first. */
export function namesakes(all: Map<string, Subject>, subject: Subject): Subject[] {
  const name = fold(subject.name);
  return [...all.values()]
    .filter((other) => other.kind === subject.kind && fold(other.name) === name)
    .sort((a, b) => b.total - a.total);
}

/**
 * The few words that say which of several namesakes this is.
 *
 * Kept to what the data actually records. Nothing here is inferred or embellished; a
 * person known only from one verse is described by that verse's book.
 */
export function descriptorOf(
  subject: Subject,
  all: Map<string, Subject>,
  books?: Book[],
  title?: string,
): string {
  if (title) return title;

  const nameOf = (id: string) => all.get(id)?.name ?? id.split('@')[0].replace(/_/g, ' ');
  const firstBook = () => {
    const first = subject.where[0];
    if (!first || !books) return '';
    const book = books.find((candidate) => candidate.id === first[0]);
    return book ? `in ${book.name}` : '';
  };

  if (subject.kind === 'place') {
    return (
      subject.area ||
      (subject.near && subject.near !== subject.name ? subject.near : '') ||
      firstBook()
    );
  }

  if (subject.type === 'Group') return subject.tribe ? `people of ${subject.tribe}` : 'a people';

  const parent = subject.parents.find((relative) => relative.note !== 'descended');
  if (parent) {
    const role = subject.type === 'Female' ? 'daughter' : 'son';
    return `${parent.note === 'ancestor' ? 'descendant' : role} of ${nameOf(parent.id)}`;
  }

  const partner = subject.partners[0];
  if (partner) return `${subject.type === 'Female' ? 'wife' : 'husband'} of ${nameOf(partner.id)}`;

  const child = subject.children[0];
  if (child) return `${subject.type === 'Female' ? 'mother' : 'father'} of ${nameOf(child.id)}`;

  if (subject.tribe) return `of ${subject.tribe}`;
  return firstBook();
}
