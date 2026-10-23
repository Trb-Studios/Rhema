/**
 * Reading settings.
 *
 * Kept on this device for now. Once sign-in lands these move to the person's account so
 * they follow them between machines. Every value is applied as a CSS variable, so the
 * whole app reflows the moment one changes.
 */

import { useEffect, useState } from 'react';

export type Settings = {
  theme: 'system' | 'light' | 'dark';
  /** Scripture size in pixels. The person can set anything from 15 to 26. */
  size: number;
  lineHeight: number;
  /** Column width in pixels. Narrow reads better than wide. */
  width: number;
  verseNumbers: boolean;
  /** One verse per line, rather than flowing as paragraphs. */
  versePerLine: boolean;
};

export const DEFAULTS: Settings = {
  theme: 'system',
  size: 19,
  lineHeight: 1.7,
  width: 640,
  verseNumbers: true,
  versePerLine: false,
};

const KEY = 'rhema.settings';

function load(): Settings {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? { ...DEFAULTS, ...(JSON.parse(saved) as Partial<Settings>) } : DEFAULTS;
  } catch {
    // A browser with storage blocked still reads fine; it just will not remember.
    return DEFAULTS;
  }
}

function apply(settings: Settings) {
  const root = document.documentElement;

  if (settings.theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', settings.theme);

  root.style.setProperty('--reading-size', `${settings.size}px`);
  root.style.setProperty('--reading-line', String(settings.lineHeight));
  root.style.setProperty('--reading-width', `${settings.width}px`);
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    apply(settings);
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Not being able to save is not worth interrupting a reading session over.
    }
  }, [settings]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return { settings, update };
}
