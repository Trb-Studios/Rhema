import { useState } from 'react';
import { motion } from 'framer-motion';
import { apply, collect, countsOf, load, save } from '../lib/backup';
import type { Backup as BackupFile } from '../lib/backup';
import { spring } from '../lib/motion';

type State =
  | { kind: 'idle' }
  | { kind: 'saved'; where: string }
  | { kind: 'found'; file: BackupFile }
  | { kind: 'restored' }
  | { kind: 'failed'; why: string };

/**
 * Keeping a copy.
 *
 * Notes, highlights and years of reading live on this machine only. One file the person
 * keeps is the difference between a new laptop costing an afternoon and costing
 * everything they have written.
 *
 * Restoring asks which way round it should go, because the two cases are genuinely
 * different and guessing wrong is destructive: a new machine wants the file to win,
 * while a second machine wants the two merged.
 */
export function Backup() {
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function onSave() {
    try {
      const where = await save(collect());
      if (where) setState({ kind: 'saved', where });
    } catch (error) {
      setState({ kind: 'failed', why: (error as Error).message });
    }
  }

  async function onChoose() {
    try {
      const file = await load();
      if (file) setState({ kind: 'found', file });
    } catch (error) {
      setState({ kind: 'failed', why: (error as Error).message });
    }
  }

  function restore(mode: 'replace' | 'merge') {
    if (state.kind !== 'found') return;
    apply(state.file, mode);
    setState({ kind: 'restored' });
    // Everything already on screen was read from storage at startup, so the only honest
    // way to show the restored state is to start again from it.
    setTimeout(() => window.location.reload(), 600);
  }

  const counts = state.kind === 'found' ? countsOf(state.file) : null;

  return (
    <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
        Your notes, highlights and reading are kept on this computer. Save a copy somewhere safe,
        and you can put it back on another machine or after a reinstall.
      </p>

      <div style={{ display: 'flex', gap: 7 }}>
        <Action onClick={onSave}>Save a copy</Action>
        <Action onClick={onChoose}>Restore from a file</Action>
      </div>

      {state.kind === 'saved' && <Note>Saved to {state.where}.</Note>}

      {state.kind === 'restored' && <Note>Restored. Reopening…</Note>}

      {state.kind === 'failed' && <Note tone="warn">{state.why}</Note>}

      {state.kind === 'found' && counts && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: 'var(--bg-sunken)',
            border: '1px solid var(--line-default)',
            display: 'grid',
            gap: 9,
          }}
        >
          <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
            That file holds <Count n={counts.notes} one="note" many="notes" />,{' '}
            <Count n={counts.highlights} one="highlight" many="highlights" />,{' '}
            <Count n={counts.saved} one="saved verse" many="saved verses" /> and{' '}
            <Count n={counts.chaptersRead} one="chapter" many="chapters" /> read.
          </div>

          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <Action onClick={() => restore('merge')}>Add it to what is here</Action>
            <Action tone="warn" onClick={() => restore('replace')}>
              Replace what is here
            </Action>
            <Action onClick={() => setState({ kind: 'idle' })}>Cancel</Action>
          </div>

          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.55 }}>
            Adding keeps both sides and never deletes a note. Replacing throws away what is on this
            computer.
          </p>
        </div>
      )}
    </div>
  );
}

function Count({ n, one, many }: { n: number; one: string; many: string }) {
  return (
    <>
      <strong className="tabular">{n}</strong> {n === 1 ? one : many}
    </>
  );
}

function Action({
  onClick,
  tone,
  children,
}: {
  onClick: () => void;
  tone?: 'warn';
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={spring.snappy}
      onClick={onClick}
      style={{
        padding: '7px 13px',
        borderRadius: 'var(--radius-control)',
        border: `1px solid ${tone === 'warn' ? 'var(--text-faint)' : 'var(--line-default)'}`,
        fontWeight: 600,
        fontSize: 12.5,
        color: tone === 'warn' ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
    >
      {children}
    </motion.button>
  );
}

function Note({ children, tone }: { children: React.ReactNode; tone?: 'warn' }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 12,
        lineHeight: 1.55,
        color: tone === 'warn' ? 'var(--text-primary)' : 'var(--text-secondary)',
        wordBreak: 'break-word',
      }}
    >
      {children}
    </p>
  );
}
