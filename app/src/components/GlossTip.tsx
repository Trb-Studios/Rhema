import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { EditionId } from '../lib/editions';
import type { Word } from '../lib/words';
import { entryOf, meaningNow, parse, shortSenses, strongsOf } from '../lib/words';
import { prefersReducedMotion, spring } from '../lib/motion';
import { Portal } from './Portal';

export type GlossTarget = {
  word: Word;
  edition: EditionId;
  /** The word's box on screen, so the card can sit over it. */
  left: number;
  top: number;
  width: number;
  bottom: number;
};

/**
 * What a Hebrew or Greek word means, shown while the pointer rests on it.
 *
 * The original stays on the page; the meaning floats over it, the way a reader's
 * interlinear does it. There is one card, not one per word: it glides from word to word
 * as the pointer moves along the line, so reading across a verse feels like running a
 * finger under it rather than like a row of popups flashing.
 */
export function GlossTip({ target }: { target: GlossTarget | null }) {
  const [size, setSize] = useState({ width: 220, height: 80 });
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!box.current) return;
    const rect = box.current.getBoundingClientRect();
    if (Math.abs(rect.width - size.width) > 1 || Math.abs(rect.height - size.height) > 1) {
      setSize({ width: rect.width, height: rect.height });
    }
  });

  let content: React.ReactNode = null;
  let left = 0;
  let top = 0;
  let below = false;

  if (target) {
    const [written, lemma, code] = target.word;
    const entry = meaningNow(target.edition, lemma);
    const gloss = entry?.[2] ?? '';
    const senses = entry ? shortSenses(target.edition, entry[3]) : '';
    const parsing = parse(target.edition, code);
    const strongs = strongsOf(target.edition, lemma);

    const centre = target.left + target.width / 2;
    left = Math.min(Math.max(12, centre - size.width / 2), window.innerWidth - size.width - 12);
    below = target.top - size.height - 12 < 60;
    top = below ? target.bottom + 10 : target.top - size.height - 10;

    content = (
      <>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 8,
            color: 'var(--text-faint)',
            fontSize: 11.5,
          }}
        >
          <span
            lang={target.edition === 'hebrew' ? 'he' : 'grc'}
            style={{
              fontFamily: target.edition === 'hebrew' ? 'var(--font-hebrew)' : 'var(--font-greek)',
              fontSize: target.edition === 'hebrew' ? 16 : 14,
              color: 'var(--text-secondary)',
            }}
          >
            {entry?.[0] ?? entryOf(target.edition, lemma) ?? written}
          </span>
          {entry?.[1] && <span style={{ fontStyle: 'italic' }}>{entry[1]}</span>}
          {strongs && <span className="tabular">{strongs}</span>}
        </div>
        <div
          style={{ marginTop: 3, fontWeight: 650, fontSize: 14.5, color: 'var(--text-primary)' }}
        >
          {gloss || 'No dictionary entry'}
        </div>
        {senses && senses.toLowerCase() !== gloss.toLowerCase() && (
          <div
            style={{
              marginTop: 1,
              fontSize: 12.5,
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
            }}
          >
            {senses}
          </div>
        )}
        {parsing.length > 0 && (
          <div
            style={{
              marginTop: 6,
              paddingTop: 6,
              borderTop: '1px solid var(--glass-border)',
              fontSize: 11,
              color: 'var(--text-faint)',
              letterSpacing: '0.01em',
            }}
          >
            {parsing.join(' · ')}
          </div>
        )}
      </>
    );
  }

  const reduce = prefersReducedMotion();

  return (
    <Portal>
      <AnimatePresence>
        {target && (
          <motion.div
            ref={box}
            role="tooltip"
            className="glass"
            initial={{ opacity: 0, scale: 0.94, left, top: top + (below ? -6 : 6) }}
            animate={{ opacity: 1, scale: 1, left, top }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
            transition={
              reduce
                ? { duration: 0.1 }
                : { ...spring.snappy, opacity: { duration: 0.12 }, scale: { duration: 0.14 } }
            }
            style={{
              position: 'fixed',
              zIndex: 70,
              minWidth: 150,
              maxWidth: 280,
              padding: '9px 13px 10px',
              borderRadius: 11,
              textAlign: 'center',
              pointerEvents: 'none',
              transformOrigin: below ? 'top center' : 'bottom center',
            }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/**
 * Tracks which word the pointer is over.
 *
 * Leaving a word does not hide the card at once: the pointer crossing the space between
 * two words would otherwise make it blink. It waits a moment, and entering the next word
 * cancels the wait, so the card glides instead.
 */
export function useGlossHover() {
  const [target, setTarget] = useState<GlossTarget | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const enter = useCallback((word: Word, edition: EditionId, element: HTMLElement) => {
    window.clearTimeout(timer.current);
    const rect = element.getBoundingClientRect();
    setTarget({
      word,
      edition,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      bottom: rect.bottom,
    });
  }, []);

  const leave = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTarget(null), 140);
  }, []);

  const clear = useCallback(() => {
    window.clearTimeout(timer.current);
    setTarget(null);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { target, enter, leave, clear };
}
