import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { keyLabel } from '../lib/commands';

/**
 * A label that appears under a control after a moment's hover.
 *
 * An icon on its own is a guess until you click it. The delay is what keeps a row of
 * them from flashing labels as the pointer crosses: the first one waits, and once one
 * is showing the rest follow at once, which is how a menu bar behaves.
 */
let showingSince = 0;

export function Tip({
  label,
  shortcut,
  side = 'bottom',
  children,
}: {
  label: string;
  shortcut?: string;
  side?: 'bottom' | 'top';
  children: ReactNode;
}) {
  const [shown, setShown] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  function show() {
    // Within a moment of the last tip closing, the next opens immediately.
    const quick = Date.now() - showingSince < 400;
    timer.current = window.setTimeout(() => setShown(true), quick ? 0 : 450);
  }

  function hide() {
    window.clearTimeout(timer.current);
    if (shown) showingSince = Date.now();
    setShown(false);
  }

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onPointerEnter={show}
      onPointerLeave={hide}
      onPointerDown={hide}
    >
      {children}
      <AnimatePresence>
        {shown && (
          <motion.span
            initial={{ opacity: 0, y: side === 'bottom' ? -3 : 3, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            role="tooltip"
            style={{
              position: 'absolute',
              [side === 'bottom' ? 'top' : 'bottom']: 'calc(100% + 7px)',
              left: '50%',
              translate: '-50% 0',
              zIndex: 90,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '5px 9px',
              borderRadius: 7,
              background: 'var(--text-primary)',
              color: 'var(--bg-card)',
              font: '500 12px var(--font-ui)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 4px 14px rgba(0,0,0,.18)',
            }}
          >
            {label}
            {shortcut && (
              <kbd
                style={{
                  font: '500 11px var(--font-ui)',
                  opacity: 0.65,
                }}
              >
                {keyLabel(shortcut)}
              </kbd>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
