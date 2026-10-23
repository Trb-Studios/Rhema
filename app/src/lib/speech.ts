/**
 * Reading a chapter aloud.
 *
 * Uses the voices already on the machine rather than a service, so it works offline,
 * costs nothing, and sends no text anywhere. Windows and macOS both ship several.
 *
 * Speech is queued one verse at a time rather than as a whole chapter, for two reasons:
 * the reader can follow which verse is being spoken, and stopping is immediate. A long
 * utterance cannot be interrupted part-way on every platform.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechState = {
  /** Whether anything is being spoken now. */
  speaking: boolean;
  paused: boolean;
  /** The verse being spoken, so the reader can follow it. */
  verse: number | null;
};

/** Whether this machine can speak at all. */
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * The voices worth offering, best first.
 *
 * A machine may list dozens, most of them for other languages. Only voices for the
 * language being read are offered, and a voice installed locally is preferred over one
 * that needs the network.
 */
export function voicesFor(language: string): SpeechSynthesisVoice[] {
  if (!canSpeak()) return [];
  const prefix = language.toLowerCase();
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith(prefix))
    .sort((a, b) => {
      if (a.localService !== b.localService) return a.localService ? -1 : 1;
      if (a.default !== b.default) return a.default ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * The language tag for an edition.
 *
 * The Hebrew and Greek are given their own tags, though few machines have a voice for
 * either; where none exists the control says so rather than reading Hebrew aloud in an
 * English voice, which produces nonsense.
 */
export function languageOf(edition: string): string {
  if (edition === 'hebrew') return 'he';
  if (edition === 'greek') return 'el';
  return 'en';
}

export type Spoken = { verse: number; text: string };

export function useSpeech() {
  const [state, setState] = useState<SpeechState>({
    speaking: false,
    paused: false,
    verse: null,
  });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // The queue is held in a ref so stopping does not depend on a re-render.
  const queue = useRef<Spoken[]>([]);
  const at = useRef(0);
  const stopped = useRef(false);

  // Voices arrive asynchronously on most browsers, and the first call returns nothing.
  useEffect(() => {
    if (!canSpeak()) return;
    const read = () => setVoices(window.speechSynthesis.getVoices());
    read();
    window.speechSynthesis.addEventListener('voiceschanged', read);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', read);
  }, []);

  const stop = useCallback(() => {
    if (!canSpeak()) return;
    stopped.current = true;
    queue.current = [];
    at.current = 0;
    window.speechSynthesis.cancel();
    setState({ speaking: false, paused: false, verse: null });
  }, []);

  // Speech keeps running after the page is gone unless it is cancelled.
  useEffect(() => stop, [stop]);

  const speak = useCallback(
    (
      verses: Spoken[],
      options: { voice?: SpeechSynthesisVoice; rate?: number; from?: number } = {},
    ) => {
      if (!canSpeak() || verses.length === 0) return;

      window.speechSynthesis.cancel();
      stopped.current = false;
      queue.current = verses;
      at.current = Math.max(
        0,
        options.from ? verses.findIndex((verse) => verse.verse === options.from) : 0,
      );

      const next = () => {
        if (stopped.current) return;
        const item = queue.current[at.current];
        if (!item) {
          setState({ speaking: false, paused: false, verse: null });
          return;
        }

        const utterance = new SpeechSynthesisUtterance(item.text);
        if (options.voice) utterance.voice = options.voice;
        utterance.rate = options.rate ?? 1;

        utterance.onstart = () => setState({ speaking: true, paused: false, verse: item.verse });
        utterance.onend = () => {
          if (stopped.current) return;
          at.current += 1;
          next();
        };
        utterance.onerror = (event) => {
          // Cancelling raises an error on some browsers; that is not a failure.
          if (stopped.current || event.error === 'interrupted' || event.error === 'canceled')
            return;
          setState({ speaking: false, paused: false, verse: null });
        };

        window.speechSynthesis.speak(utterance);
      };

      next();
    },
    [],
  );

  const pause = useCallback(() => {
    if (!canSpeak()) return;
    window.speechSynthesis.pause();
    setState((current) => ({ ...current, paused: true }));
  }, []);

  const resume = useCallback(() => {
    if (!canSpeak()) return;
    window.speechSynthesis.resume();
    setState((current) => ({ ...current, paused: false }));
  }, []);

  return { ...state, voices, speak, stop, pause, resume, supported: canSpeak() };
}
