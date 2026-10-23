import { beforeEach, describe, expect, it } from 'vitest';
import { apply, collect, countsOf, KEYS, parse, suggestedName } from './backup';
import type { Backup } from './backup';

// A plain stand-in for the browser's storage, since these tests run in node.
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
});

function put(key: string, value: unknown) {
  store.set(key, JSON.stringify(value));
}

function read<T>(key: string): T {
  return JSON.parse(store.get(key)!) as T;
}

function backupOf(data: Record<string, unknown>): Backup {
  return { format: 1, app: 'Rhema', savedAt: '2026-10-23T00:00:00.000Z', data };
}

describe('collecting a backup', () => {
  it('takes everything the app owns', () => {
    put('rhema.notes', { '1:1': 'In the beginning' });
    put('rhema.saved', [{ bookId: 1, chapter: 1, verse: 1 }]);
    const backup = collect();
    expect(backup.app).toBe('Rhema');
    expect(backup.format).toBe(1);
    expect(backup.data['rhema.notes']).toEqual({ '1:1': 'In the beginning' });
  });

  it('leaves out keys that were never written', () => {
    put('rhema.notes', {});
    expect(Object.keys(collect().data)).toEqual(['rhema.notes']);
  });

  it('survives storage holding something unparseable', () => {
    store.set('rhema.notes', 'not json');
    expect(() => collect()).not.toThrow();
    expect(collect().data['rhema.notes']).toBeUndefined();
  });

  it('names the file by the day it was made', () => {
    expect(suggestedName()).toMatch(/^rhema-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });
});

describe('reading a backup file', () => {
  it('refuses anything that is not one', () => {
    expect(() => parse('not json')).toThrow(/not readable/i);
    expect(() => parse('{"app":"Something else"}')).toThrow(/does not look like/i);
    expect(() => parse('null')).toThrow(/does not look like/i);
    expect(() => parse(JSON.stringify({ app: 'Rhema', format: 9, data: {} }))).toThrow(/format 9/);
  });

  it('accepts one this version wrote', () => {
    put('rhema.notes', { '1:1': 'a note' });
    expect(parse(JSON.stringify(collect())).data['rhema.notes']).toEqual({ '1:1': 'a note' });
  });

  it('says what is in it in the terms a reader thinks in', () => {
    const counts = countsOf(
      backupOf({
        'rhema.notes': { '1:1': 'a', '2:3': 'b' },
        'rhema.highlights': { '1:1:1': 3 },
        'rhema.saved': [1, 2, 3],
        'rhema.progress': { read: ['1:1', '1:2'] },
        'rhema.review': { a: {}, b: {} },
      }),
    );
    expect(counts).toEqual({
      notes: 2,
      highlights: 1,
      saved: 3,
      chaptersRead: 2,
      inReview: 2,
    });
  });

  it('counts an empty backup as nothing rather than crashing', () => {
    expect(countsOf(backupOf({}))).toEqual({
      notes: 0,
      highlights: 0,
      saved: 0,
      chaptersRead: 0,
      inReview: 0,
    });
  });
});

describe('restoring onto a new machine', () => {
  it('replaces everything', () => {
    put('rhema.notes', { '1:1': 'local' });
    apply(backupOf({ 'rhema.notes': { '2:2': 'from backup' } }), 'replace');
    expect(read('rhema.notes')).toEqual({ '2:2': 'from backup' });
  });

  it('leaves alone what the backup does not mention', () => {
    put('rhema.settings', { size: 22 });
    apply(backupOf({ 'rhema.notes': {} }), 'replace');
    expect(read('rhema.settings')).toEqual({ size: 22 });
  });
});

describe('merging two devices', () => {
  it('keeps the longer note when both wrote one for the same chapter', () => {
    // Losing the longer note would quietly destroy the work; this is the case that
    // matters most in the whole file.
    put('rhema.notes', { '1:1': 'short', '1:2': 'only here' });
    apply(
      backupOf({ 'rhema.notes': { '1:1': 'a much longer note', '1:3': 'only there' } }),
      'merge',
    );
    expect(read('rhema.notes')).toEqual({
      '1:1': 'a much longer note',
      '1:2': 'only here',
      '1:3': 'only there',
    });
  });

  it('never drops a note that exists on only one side', () => {
    put('rhema.notes', { '1:1': 'mine' });
    apply(backupOf({ 'rhema.notes': { '9:9': 'theirs' } }), 'merge');
    expect(Object.keys(read<object>('rhema.notes')).sort()).toEqual(['1:1', '9:9']);
  });

  it('prefers the colour already on this machine', () => {
    put('rhema.highlights', { '1:1:1': 3 });
    apply(backupOf({ 'rhema.highlights': { '1:1:1': 7, '1:1:2': 4 } }), 'merge');
    expect(read('rhema.highlights')).toEqual({ '1:1:1': 3, '1:1:2': 4 });
  });

  it('unions saved verses without duplicating them', () => {
    put('rhema.saved', [{ bookId: 1, chapter: 1, verse: 1, text: 'mine' }]);
    apply(
      backupOf({
        'rhema.saved': [
          { bookId: 1, chapter: 1, verse: 1, text: 'theirs' },
          { bookId: 43, chapter: 3, verse: 16, text: 'new' },
        ],
      }),
      'merge',
    );
    const saved = read<{ verse: number; text: string }[]>('rhema.saved');
    expect(saved).toHaveLength(2);
    expect(saved[0].text).toBe('mine');
  });

  it('unions what has been read and the days it was read on', () => {
    put('rhema.progress', { read: ['1:1'], days: ['2026-01-01'], last: { bookId: 1, chapter: 1 } });
    apply(
      backupOf({
        'rhema.progress': { read: ['1:1', '1:2'], days: ['2026-01-02'], last: null },
      }),
      'merge',
    );
    const progress = read<{ read: string[]; days: string[]; last: unknown }>('rhema.progress');
    expect(progress.read.sort()).toEqual(['1:1', '1:2']);
    expect(progress.days.sort()).toEqual(['2026-01-01', '2026-01-02']);
    expect(progress.last).toEqual({ bookId: 1, chapter: 1 });
  });

  it('keeps whichever review card is due sooner', () => {
    put('rhema.review', { a: { due: '2026-12-01' }, b: { due: '2026-01-01' } });
    apply(
      backupOf({
        'rhema.review': { a: { due: '2026-02-01' }, b: { due: '2026-06-01' }, c: { due: 'x' } },
      }),
      'merge',
    );
    const cards = read<Record<string, { due: string }>>('rhema.review');
    expect(cards.a.due).toBe('2026-02-01');
    expect(cards.b.due).toBe('2026-01-01');
    expect(cards.c).toBeTruthy();
  });

  it('does not let a backup change the settings of the machine it lands on', () => {
    put('rhema.settings', { size: 22 });
    apply(backupOf({ 'rhema.settings': { size: 15 } }), 'merge');
    expect(read('rhema.settings')).toEqual({ size: 22 });
  });

  it('takes the incoming value where this machine has none', () => {
    apply(backupOf({ 'rhema.settings': { size: 15 } }), 'merge');
    expect(read('rhema.settings')).toEqual({ size: 15 });
  });

  it('round-trips the whole state unchanged', () => {
    put('rhema.notes', { '1:1': 'a' });
    put('rhema.highlights', { '1:1:1': 2 });
    put('rhema.saved', [{ bookId: 1, chapter: 1, verse: 1 }]);
    put('rhema.progress', { read: ['1:1'], days: ['2026-01-01'], last: null });
    put('rhema.review', { '1:1:1': { due: '2026-01-01' } });
    put('rhema.plan', { mode: 'days', value: 365 });
    put('rhema.settings', { size: 19 });

    const before = collect();
    const text = JSON.stringify(before);
    store.clear();
    apply(parse(text), 'replace');

    expect(collect().data).toEqual(before.data);
    for (const key of KEYS) expect(store.has(key)).toBe(true);
  });
});
