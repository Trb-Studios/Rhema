/**
 * Reading settings.
 *
 * Shared, so changing the text size in the menu reaches the reader at once. Every value
 * is also written to the document as a custom property, which is what makes the page
 * reflow the moment one changes.
 */

import { useEffect } from 'react';
import { createStore, useStore } from './store';

export type Settings = {
  theme: 'system' | 'light' | 'dark';
  /** Scripture size in pixels, anywhere from 15 to 26. */
  size: number;
  lineHeight: number;
  /** Column width in pixels. Narrow reads better than wide. */
  width: number;
  verseNumbers: boolean;
};

export const DEFAULTS: Settings = {
  theme: 'system',
  size: 19,
  lineHeight: 1.7,
  width: 640,
  verseNumbers: true,
};

const store = createStore<Settings>('rhema.settings', DEFAULTS);

function apply(settings: Settings) {
  const root = document.documentElement;

  if (settings.theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', settings.theme);

  root.style.setProperty('--reading-size', `${settings.size}px`);
  root.style.setProperty('--reading-line', String(settings.lineHeight));
  root.style.setProperty('--reading-width', `${settings.width}px`);
}

export function useSettings() {
  const [stored, setSettings] = useStore(store);
  // A stored value written before a setting existed would otherwise be missing it.
  const settings = { ...DEFAULTS, ...stored };

  useEffect(() => {
    apply(settings);
  }, [settings.theme, settings.size, settings.lineHeight, settings.width]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...DEFAULTS, ...current, [key]: value }));
  }

  return { settings, update };
}
