import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Icon } from './Icon';
import { spring } from '../lib/motion';
import { SCREENS } from '../lib/screens';
import type { ScreenId } from '../lib/screens';

export function AppShell({
  children,
  version,
  current,
  onNavigate,
}: {
  children: ReactNode;
  version: string;
  current: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}) {
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

        {SCREENS.map((screen) => {
          const active = screen.id === current;
          return (
            <motion.button
              key={screen.id}
              onClick={() => onNavigate(screen.id)}
              whileTap={{ scale: 0.97 }}
              transition={spring.snappy}
              aria-current={active ? 'page' : undefined}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                height: 40,
                padding: '0 10px',
                borderRadius: 10,
                textAlign: 'left',
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {active && (
                <motion.span
                  layoutId="rail-selection"
                  transition={spring.snappy}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 10,
                    background: 'var(--bg-selected)',
                  }}
                />
              )}
              <span
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  color: active ? 'var(--text-tan)' : undefined,
                }}
              >
                <Icon name={screen.icon} size={20} />
                <span style={{ color: 'var(--text-primary)', opacity: active ? 1 : 0.75 }}>
                  {screen.label}
                </span>
              </span>
            </motion.button>
          );
        })}

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
