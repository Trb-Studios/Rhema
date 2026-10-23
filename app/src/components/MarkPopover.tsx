import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Context, Subject } from '../lib/marks';
import { resolve } from '../lib/marks';
import { popoverVariants, transition } from '../lib/motion';

export type Anchored = { subject: Subject; at: Context; x: number; y: number };

const WIDTH = 320;

/**
 * The card that opens from a name or place in the text. It grows out of the word that
 * was tapped and closes on the next click, on Escape, or on scroll, so it never sits
 * stranded over the page.
 *
 * For a name several people bear, it names the one this passage means when the passage
 * settles it, and otherwise lists who it could be rather than guessing.
 */
export function MarkPopover({
  anchored,
  onClose,
}: {
  anchored: Anchored | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!anchored) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    // Clicking a mark focuses it, and focusing can scroll the reading pane a little.
    // Closing on that first scroll would shut the card the instant it opened, so the
    // listener starts on the next frame and ignores movement smaller than a line.
    let startedAt = 0;
    let armed = false;
    const onScroll = (event: Event) => {
      const top = (event.target as HTMLElement | null)?.scrollTop ?? window.scrollY;
      if (!armed) {
        startedAt = top;
        return;
      }
      if (Math.abs(top - startedAt) > 24) onClose();
    };

    const frame = requestAnimationFrame(() => {
      armed = true;
    });
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [anchored, onClose]);

  const resolved = anchored ? resolve(anchored.subject, anchored.at) : null;
  const person = anchored?.subject.kind === 'person';

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
              left: Math.min(
                Math.max(12, anchored.x - WIDTH / 2),
                Math.max(12, window.innerWidth - WIDTH - 12),
              ),
              top: Math.min(anchored.y + 10, Math.max(12, window.innerHeight - 260)),
              width: WIDTH,
              maxHeight: 300,
              overflowY: 'auto',
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
                color: person ? 'var(--mark-name)' : 'var(--mark-place)',
              }}
            >
              {person ? 'Person' : 'Place'}
            </div>

            <h3 style={{ fontSize: 20, marginTop: 4 }}>{anchored.subject.name}</h3>

            {anchored.subject.also && (
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
                Also {anchored.subject.also}
              </div>
            )}

            {anchored.subject.meaning && <Row label="Meaning" value={anchored.subject.meaning} />}
            {anchored.subject.modern && <Row label="Today" value={anchored.subject.modern} />}

            {/* A single, settled person, or a place. */}
            {!resolved && anchored.subject.note && (
              <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55 }}>
                {anchored.subject.note}
              </p>
            )}

            {/* A name several people bear. */}
            {resolved && resolved.certain && (
              <>
                <div style={{ fontWeight: 650, fontSize: 14, marginTop: 10 }}>
                  {resolved.candidates[0].who}
                </div>
                <p style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55 }}>
                  {resolved.candidates[0].note}
                </p>
              </>
            )}

            {resolved && !resolved.certain && (
              <>
                <p
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {resolved.candidates.length} people in Scripture bear this name, and this passage
                  does not settle which is meant.
                </p>
                <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none' }}>
                  {resolved.candidates.map((sense) => (
                    <li
                      key={sense.who}
                      style={{
                        paddingTop: 10,
                        marginTop: 10,
                        borderTop: '1px solid var(--line-default)',
                      }}
                    >
                      <div style={{ fontWeight: 650, fontSize: 13 }}>{sense.who}</div>
                      <p
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {sense.note}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
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
