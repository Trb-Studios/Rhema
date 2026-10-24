import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNotebook, wordCount } from '../lib/notebook';
import { spring } from '../lib/motion';
import { BookIcon, CheckIcon } from './Icons';

export type NotebookHandle = { jumpTo: (at: number) => void };

/**
 * The notebook's writing surface.
 *
 * The same document in the reader's side panel and on its own screen, so a thought
 * started beside the text can be finished at full width. "Add heading" drops the passage
 * being read in as a heading where the cursor is, which is how entries come to be
 * organised by passage without anyone having to type references.
 */
export const NotebookEditor = forwardRef<
  NotebookHandle,
  {
    /** The passage being read, offered as a heading to insert. */
    passage?: string;
    compact?: boolean;
    onText?: (text: string) => void;
  }
>(function NotebookEditor({ passage, compact, onText }, ref) {
  const { text, write } = useNotebook();
  const area = useRef<HTMLTextAreaElement>(null);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle');
  const lastText = useRef(text);

  useEffect(() => {
    onText?.(text);
    if (text === lastText.current) return;
    lastText.current = text;
    setSaved('saving');
    const timer = window.setTimeout(() => setSaved('saved'), 450);
    return () => window.clearTimeout(timer);
  }, [text, onText]);

  useImperativeHandle(ref, () => ({
    jumpTo(at: number) {
      const element = area.current;
      if (!element) return;
      element.focus();
      element.setSelectionRange(at, at);
      // Scroll so the heading sits near the top rather than at the bottom edge.
      const before = element.value.slice(0, at);
      const lines = before.split('\n').length;
      const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 26;
      element.scrollTop = Math.max(0, (lines - 2) * lineHeight);
    },
  }));

  function insertHeading() {
    if (!passage) return;
    const element = area.current;
    const at = element ? element.selectionStart : text.length;
    const beforeText = text.slice(0, at);
    const afterText = text.slice(at);
    const lead =
      beforeText && !beforeText.endsWith('\n\n') ? (beforeText.endsWith('\n') ? '\n' : '\n\n') : '';
    const heading = `${lead}## ${passage}\n`;
    const next = beforeText + heading + afterText;
    write(next);
    requestAnimationFrame(() => {
      const cursor = (beforeText + heading).length;
      element?.focus();
      element?.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {passage && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={spring.snappy}
            onClick={insertHeading}
            className="row-hover"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 28,
              padding: '0 10px',
              borderRadius: 7,
              border: '1px solid var(--line-default)',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ color: 'var(--text-tan)', display: 'grid' }}>
              <BookIcon size={14} />
            </span>
            Add heading: {passage}
          </motion.button>
        )}
        <span style={{ flex: 1 }} />
        <span className="tabular" style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
          {wordCount(text).toLocaleString()} words
        </span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={saved}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.14 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11.5,
              color: saved === 'saved' ? 'var(--good)' : 'var(--text-faint)',
              minWidth: 52,
              justifyContent: 'flex-end',
            }}
          >
            {saved === 'saving' ? (
              'Saving…'
            ) : saved === 'saved' ? (
              <>
                <CheckIcon size={13} tint="var(--good)" />
                Saved
              </>
            ) : (
              ''
            )}
          </motion.span>
        </AnimatePresence>
      </div>
      <textarea
        ref={area}
        value={text}
        onChange={(event) => write(event.target.value)}
        placeholder={
          'One notebook for the whole Bible. It stays as you move between chapters and books.\n\nStart a line with ## to make a heading, or add the passage you are reading as one.'
        }
        spellCheck
        style={{
          flex: 1,
          minHeight: 0,
          padding: compact ? 16 : '28px 32px',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--line-default)',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
          fontSize: compact ? 15.5 : 18,
          lineHeight: 1.7,
          resize: 'none',
          outline: 'none',
          boxShadow: 'inset 0 1px 0 var(--glass-highlight)',
          transition: 'border-color var(--dur-fast)',
        }}
        onFocus={(event) => (event.currentTarget.style.borderColor = 'var(--line-strong)')}
        onBlur={(event) => (event.currentTarget.style.borderColor = 'var(--line-default)')}
      />
    </div>
  );
});
