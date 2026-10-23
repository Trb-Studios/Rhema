import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { UpdateBanner } from './components/UpdateBanner';
import { Read } from './screens/Read';
import type { Entry } from './screens/Read';
import { Start } from './screens/Start';
import type { Opening } from './screens/Start';
import { useSettings } from './lib/settings';
import { useProgress } from './lib/progress';
import { transition } from './lib/motion';

/**
 * Rhema: the Bible and a notepad, side by side.
 *
 * Two screens. The start page answers "what now" — a verse, the way back into the text,
 * and an honest picture of the habit. The reader is everything else: progress, how long
 * the rest will take, how the page reads, all behind one button in the header so
 * nothing competes with the text.
 */
export default function App() {
  // Reading settings apply to the whole document, so they are set up once here.
  useSettings();
  const { visit } = useProgress();

  const [screen, setScreen] = useState<'start' | 'read'>('start');
  const [entry, setEntry] = useState<Entry | undefined>(undefined);

  const open = useCallback(
    (what: Opening) => {
      if ('open' in what) {
        setEntry({ open: what.open });
      } else {
        // The reader opens wherever the saved position points, so moving the position
        // is how the start page sends someone to a passage.
        visit(what.bookId, what.chapter);
        setEntry(what.verse === undefined ? {} : { verse: what.verse });
      }
      setScreen('read');
    },
    [visit],
  );

  const read = useCallback(() => {
    setEntry(undefined);
    setScreen('read');
  }, []);

  return (
    <>
      <UpdateBanner />
      <AnimatePresence mode="wait" initial={false}>
        {screen === 'start' ? (
          <motion.div
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition('smooth')}
            style={{ height: '100%' }}
          >
            <Start onRead={read} onOpen={open} />
          </motion.div>
        ) : (
          <motion.div
            key="read"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition('smooth')}
            style={{ height: '100%' }}
          >
            <Read entry={entry} onHome={() => setScreen('start')} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
