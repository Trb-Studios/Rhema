/**
 * A small shared store.
 *
 * Several parts of the app read the same state: the reader and the side panel both show
 * saved verses, the menu and the reader both act on settings. Giving each its own
 * `useState` meant each kept a private copy, so saving a verse in one never reached the
 * other. Everything that is shared goes through here instead, and every component using
 * it sees the same value.
 *
 * State is written to the device so it survives a restart. It moves to the person's
 * account once sign-in lands, and the shape here is what will be synced.
 */

import { useCallback, useSyncExternalStore } from 'react';

type Listener = () => void;

export type Store<T> = {
  get: () => T;
  set: (next: T | ((current: T) => T)) => void;
  subscribe: (listener: Listener) => () => void;
};

export function createStore<T>(key: string, fallback: T): Store<T> {
  let value: T = read();
  const listeners = new Set<Listener>();

  function read(): T {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? fallback : (JSON.parse(saved) as T);
    } catch {
      // A browser with storage blocked still works; it just will not remember.
      return fallback;
    }
  }

  function write(next: T) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Not being able to save is not worth interrupting a reading session over.
    }
  }

  return {
    get: () => value,
    set(next) {
      const resolved = typeof next === 'function' ? (next as (current: T) => T)(value) : next;
      if (Object.is(resolved, value)) return;
      value = resolved;
      write(value);
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Reads a store in a component, re-rendering whenever it changes. */
export function useStore<T>(store: Store<T>): [T, Store<T>['set']] {
  const value = useSyncExternalStore(store.subscribe, store.get, store.get);
  const set = useCallback<Store<T>['set']>((next) => store.set(next), [store]);
  return [value, set];
}
