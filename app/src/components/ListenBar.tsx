import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Verse } from '../lib/bible';
import { languageOf, voicesFor } from '../lib/speech';
import type { useSpeech } from '../lib/speech';
import { createStore, useStore } from '../lib/store';
import { spring, transition } from '../lib/motion';
import { CloseIcon } from './Icons';

/** The chosen voice and speed, remembered between sessions. */
const preference = createStore<{ voice: string; rate: number }>('rhema.speech', {
  voice: '',
  rate: 1,
});

/**
 * The bar that appears while a chapter is being read aloud.
 *
 * It sits at the foot of the page rather than in the header, because it belongs to the
 * passage being read and not to the app as a whole, and because a control you reach for
 * mid-sentence should be near the text.
 */
export function ListenBar({
  speech,
  verses,
  edition,
  bookName,
  chapter,
  onClose,
}: {
  speech: ReturnType<typeof useSpeech>;
  verses: Verse[];
  edition: string;
  bookName: string;
  chapter: number;
  onClose: () => void;
}) {
  const [chosen, setChosen] = useStore(preference);
  const [showVoices, setShowVoices] = useState(false);

  const language = languageOf(edition);
  const available = useMemo(() => voicesFor(language), [language, speech.voices]);

  const voice = useMemo(
    () => available.find((option) => option.name === chosen.voice) ?? available[0],
    [available, chosen.voice],
  );

  // Changing chapter or edition stops the reading rather than carrying on into text
  // that is no longer on screen.
  useEffect(() => {
    speech.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookName, chapter, edition]);

  const start = (from?: number) =>
    speech.speak(
      verses.map((verse) => ({ verse: verse.number, text: verse.text })),
      { voice, rate: chosen.rate, from },
    );

  const noVoice = available.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={transition('snappy')}
      role="region"
      aria-label="Listening"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 22,
        transform: 'translateX(-50%)',
        zIndex: 25,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '9px 13px',
        borderRadius: 999,
        background: 'var(--bg-card)',
        border: '1px solid var(--line-default)',
        boxShadow: 'var(--shadow-shell)',
        maxWidth: 'calc(100vw - 48px)',
      }}
    >
      {noVoice ? (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '0 4px' }}>
          This machine has no{' '}
          {language === 'he' ? 'Hebrew' : language === 'el' ? 'Greek' : 'English'} voice installed,
          so there is nothing to read with.
        </span>
      ) : (
        <>
          <motion.button
            whileTap={{ scale: 0.94 }}
            transition={spring.snappy}
            onClick={() => {
              if (!speech.speaking) start();
              else if (speech.paused) speech.resume();
              else speech.pause();
            }}
            aria-label={!speech.speaking ? 'Read aloud' : speech.paused ? 'Continue' : 'Pause'}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'var(--main-fill)',
              color: 'var(--main-on)',
            }}
          >
            {!speech.speaking || speech.paused ? <PlayGlyph /> : <PauseGlyph />}
          </motion.button>

          <span
            className="tabular"
            style={{ fontSize: 13, minWidth: 92, color: 'var(--text-secondary)' }}
          >
            {speech.verse ? `${bookName} ${chapter}:${speech.verse}` : `${verses.length} verses`}
          </span>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            Speed
            <input
              type="range"
              min={0.6}
              max={1.6}
              step={0.1}
              value={chosen.rate}
              onChange={(event) => {
                const rate = Number(event.target.value);
                setChosen((current) => ({ ...current, rate }));
                // Rate cannot change mid-utterance, so a reading in progress restarts
                // from the verse being spoken rather than from the top.
                if (speech.speaking) {
                  const from = speech.verse ?? undefined;
                  speech.stop();
                  window.setTimeout(
                    () =>
                      speech.speak(
                        verses.map((verse) => ({ verse: verse.number, text: verse.text })),
                        { voice, rate, from },
                      ),
                    60,
                  );
                }
              }}
              aria-label="Reading speed"
              style={{ width: 74, accentColor: 'var(--main-fill)' }}
            />
            <span className="tabular" style={{ width: 26 }}>
              {chosen.rate.toFixed(1)}×
            </span>
          </label>

          {available.length > 1 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowVoices((open) => !open)}
                aria-expanded={showVoices}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '5px 10px',
                  borderRadius: 999,
                  background: 'var(--bg-sunken)',
                  maxWidth: 150,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {voice?.name ?? 'Voice'}
              </button>

              <AnimatePresence>
                {showVoices && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={transition('snappy')}
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 9px)',
                      right: 0,
                      width: 240,
                      maxHeight: 260,
                      overflowY: 'auto',
                      padding: 6,
                      borderRadius: 12,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--line-default)',
                      boxShadow: 'var(--shadow-shell)',
                    }}
                  >
                    {available.map((option) => (
                      <button
                        key={option.name}
                        onClick={() => {
                          setChosen((current) => ({ ...current, voice: option.name }));
                          setShowVoices(false);
                          speech.stop();
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'start',
                          padding: '7px 10px',
                          borderRadius: 8,
                          fontSize: 13,
                          background:
                            option.name === voice?.name ? 'var(--bg-selected)' : 'transparent',
                        }}
                      >
                        {option.name}
                        {!option.localService && (
                          <span
                            style={{
                              display: 'block',
                              fontSize: 11,
                              color: 'var(--text-faint)',
                            }}
                          >
                            needs the internet
                          </span>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      <button
        onClick={() => {
          speech.stop();
          onClose();
        }}
        aria-label="Stop listening"
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-secondary)',
        }}
      >
        <CloseIcon size={15} />
      </button>
    </motion.div>
  );
}

function PlayGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5h3.2v13H8zM12.8 5.5H16v13h-3.2z" fill="currentColor" />
    </svg>
  );
}
