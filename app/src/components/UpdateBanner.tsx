import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CHECK_DELAY_MS, checkForUpdate, restartIntoUpdate } from '../lib/updater';
import type { UpdateState } from '../lib/updater';
import { transition } from '../lib/motion';

/**
 * A quiet strip that appears only once an update is downloaded and ready.
 * Checking and downloading happen silently; the person is never interrupted mid-read.
 */
export function UpdateBanner() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' });

  useEffect(() => {
    const timer = setTimeout(() => void checkForUpdate(setState), CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const ready = state.status === 'ready';

  return (
    <AnimatePresence>
      {ready && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={transition('smooth')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '16px 40px 0',
            padding: '12px 16px',
            borderRadius: 'var(--radius-card)',
            background: 'var(--bg-card)',
            border: '1px solid var(--line-default)',
          }}
        >
          <span>Version {state.version} is ready. Restart whenever it suits you.</span>
          <button
            onClick={() => void restartIntoUpdate()}
            style={{
              marginLeft: 'auto',
              padding: '8px 16px',
              borderRadius: 'var(--radius-control)',
              background: 'var(--main-fill)',
              color: 'var(--main-on)',
              fontWeight: 600,
            }}
          >
            Restart now
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
