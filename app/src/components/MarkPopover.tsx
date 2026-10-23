import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Subject } from '../lib/marks';
import { popoverVariants, transition } from '../lib/motion';

export type Anchored = { subject: Subject; x: number; y: number };

/**
 * The card that opens from a name or place in the text. It grows out of the word that
 * was tapped and closes on the next click, on Escape, or on scroll, so it never sits
 * stranded over the page.
 */
export function MarkPopover({
  anchored,
  onClose,
}: {
  anchored: Anchored | null;
  onClose: () => void;
}) {
  const [width] = useState(300);

  useEffect(() => {
    if (!anchored) return;
    const close = () => onClose();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [anchored, onClose]);

  return (
    <AnimatePresence>
      {anchored && (
        <>
          <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 50 }}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-label={anchored.subject.name}
            variants={popoverVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition('snappy')}
            style={{
              position: 'fixed',
              zIndex: 51,
              // Kept inside the window, and just below the word.
              left: Math.min(Math.max(12, anchored.x - width / 2), window.innerWidth - width - 12),
              top: Math.min(anchored.y + 10, window.innerHeight - 220),
              width,
              transformOrigin: 'top center',
              padding: 16,
              borderRadius: 'var(--radius-card)',
              background: 'var(--bg-card)',
              border: '1px solid var(--line-default)',
              boxShadow: 'var(--shadow-shell)',
            }}
          >
            <div
              style={{
                font: '600 11px var(--font-ui)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color:
                  anchored.subject.kind === 'person' ? 'var(--mark-name)' : 'var(--mark-place)',
              }}
            >
              {anchored.subject.kind === 'person' ? 'Person' : 'Place'}
            </div>

            <h3 style={{ fontSize: 20, marginTop: 4 }}>{anchored.subject.name}</h3>

            {anchored.subject.also && (
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
                Also {anchored.subject.also}
              </div>
            )}

            {anchored.subject.meaning && <Row label="Meaning" value={anchored.subject.meaning} />}
            {anchored.subject.modern && <Row label="Today" value={anchored.subject.modern} />}

            <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55 }}>{anchored.subject.note}</p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 13 }}>
      <span style={{ color: 'var(--text-secondary)', flex: 'none' }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
