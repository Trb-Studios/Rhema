import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { goBack, openPalette, useCanGoBack } from '../lib/nav';
import { spring } from '../lib/motion';
import { ArrowIcon, SearchIcon } from './Icons';
import { Tip } from './Tip';

/**
 * The bar across the top of every screen but the reader: where you are, and the few
 * things this screen does. Matches the reader's bar in height and weight so moving
 * between screens never shifts the page.
 */
export function ScreenHeader({
  icon,
  crumbs,
  actions,
}: {
  icon: ReactNode;
  crumbs: ReactNode[];
  actions?: ReactNode;
}) {
  const canGoBack = useCanGoBack();
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 'var(--topbar-height)',
        padding: '0 10px 0 12px',
        flex: 'none',
        borderBottom: '1px solid var(--line-default)',
        background: 'var(--bg-page)',
      }}
    >
      <Tip label="Back" shortcut="Alt+←">
        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={spring.snappy}
          onClick={goBack}
          disabled={!canGoBack}
          aria-label="Back"
          className={canGoBack ? 'row-hover' : undefined}
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--text-secondary)',
            opacity: canGoBack ? 1 : 0.3,
          }}
        >
          <ArrowIcon dir="left" size={16} />
        </motion.button>
      </Tip>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          minWidth: 0,
          marginLeft: 4,
        }}
      >
        <span style={{ color: 'var(--text-tan)', display: 'grid' }}>{icon}</span>
        {crumbs.map((crumb, index) => (
          <span key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {index > 0 && <span style={{ color: 'var(--text-faint)' }}>›</span>}
            <span
              style={{
                color:
                  index === crumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: index === crumbs.length - 1 ? 600 : 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {crumb}
            </span>
          </span>
        ))}
      </div>
      <span style={{ flex: 1 }} />
      {actions}
      <Tip label="Search everything" shortcut="Mod+K">
        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={spring.snappy}
          onClick={openPalette}
          aria-label="Search everything"
          className="row-hover"
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <SearchIcon size={17} />
        </motion.button>
      </Tip>
    </header>
  );
}
