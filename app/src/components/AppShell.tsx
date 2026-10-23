import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Icon } from './Icon';
import { spring } from '../lib/motion';

/** The areas in the side rail, in order. Each gains a screen as it is built. */
const AREAS = [
  { id: 'home', label: 'Home' },
  { id: 'read', label: 'Read' },
  { id: 'people', label: 'People' },
  { id: 'places', label: 'Places' },
  { id: 'words', label: 'Words' },
  { id: 'notes', label: 'Notes' },
  { id: 'plan', label: 'Plan' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'review', label: 'Review' },
  { id: 'settings', label: 'Settings' },
] as const;

export function AppShell({ children, version }: { children: ReactNode; version: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '232px minmax(0, 1fr)', height: '100%' }}>
      <nav
        aria-label="Main"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          padding: '18px 12px',
          background: 'var(--bg-shell)',
          borderRight: '1px solid var(--line-default)',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '4px 10px 18px',
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: 'var(--main-fill)',
              color: 'var(--main-on)',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--font-display)',
            }}
          >
            R
          </span>
          Rhema
        </div>

        {AREAS.map((area, index) => (
          <motion.button
            key={area.id}
            whileTap={{ scale: 0.97 }}
            transition={spring.snappy}
            aria-current={index === 0 ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              height: 40,
              padding: '0 10px',
              borderRadius: 10,
              textAlign: 'left',
              fontWeight: index === 0 ? 600 : 500,
              color: index === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: index === 0 ? 'var(--bg-selected)' : 'transparent',
            }}
          >
            <Icon name={area.id} size={20} />
            {area.label}
          </motion.button>
        ))}

        <div
          style={{
            marginTop: 'auto',
            padding: '12px 10px 0',
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          KJV · public domain
          <br />
          <span className="tabular">Version {version || '…'}</span>
        </div>
      </nav>

      <main style={{ minWidth: 0, overflowY: 'auto' }}>{children}</main>
    </div>
  );
}
