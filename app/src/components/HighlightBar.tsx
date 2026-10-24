import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HIGHLIGHTS, QUICK_PICKS } from '../lib/highlights';
import { spring, transition } from '../lib/motion';
import { CopyIcon, PlusIcon, StickyIcon, TrashIcon } from './Icons';
import { Portal } from './Portal';

export type BarTarget =
  | {
      mode: 'new';
      text: string;
      rect: { left: number; top: number; width: number; bottom: number };
    }
  | {
      mode: 'edit';
      id: string;
      text: string;
      colour: number;
      rect: { left: number; top: number; width: number; bottom: number };
    };

/**
 * The bar that floats over selected text.
 *
 * Select any words and it offers a colour, a sticky note, or a copy; click a highlight
 * already made and the same bar offers to recolour or remove it. A dozen colours sit in
 * the bar and the full thirty open beneath it, so the common case is one click.
 */
export function HighlightBar({
  target,
  onColour,
  onRemove,
  onSticky,
  onCopy,
  onClose,
}: {
  target: BarTarget | null;
  onColour: (index: number) => void;
  onRemove: () => void;
  onSticky: () => void;
  onCopy: () => void;
  onClose: () => void;
}) {
  const [more, setMore] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMore(false);
    setCopied(false);
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  const width = 404;
  const left = target
    ? Math.min(
        Math.max(12, target.rect.left + target.rect.width / 2 - width / 2),
        window.innerWidth - width - 12,
      )
    : 0;
  const above = target ? target.rect.top > 120 : true;
  const top = target ? (above ? target.rect.top - 54 : target.rect.bottom + 10) : 0;

  return (
    <Portal>
      <AnimatePresence>
        {target && (
          <motion.div
            key={target.mode === 'edit' ? target.id : 'new'}
            role="toolbar"
            aria-label={target.mode === 'new' ? 'Highlight the selection' : 'Change this highlight'}
            initial={{ opacity: 0, y: above ? 8 : -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: above ? 4 : -4, scale: 0.97, transition: { duration: 0.1 } }}
            transition={transition('snappy')}
            onPointerDown={(event) => event.preventDefault()}
            className="glass"
            style={{
              position: 'fixed',
              left,
              top,
              zIndex: 65,
              width,
              borderRadius: 13,
              padding: 6,
              transformOrigin: above ? 'bottom center' : 'top center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ display: 'flex', gap: 3, padding: '0 4px' }}>
                {QUICK_PICKS.slice(0, 9).map((pick, index) => (
                  <Swatch
                    key={pick.index}
                    colour={pick.colour}
                    name={pick.name}
                    active={target.mode === 'edit' && target.colour === pick.index}
                    delay={index * 0.015}
                    onClick={() => onColour(pick.index)}
                  />
                ))}
              </div>
              <BarButton
                label="More colours"
                active={more}
                onClick={() => setMore((value) => !value)}
              >
                <motion.span
                  animate={{ rotate: more ? 45 : 0 }}
                  transition={spring.snappy}
                  style={{ display: 'grid' }}
                >
                  <PlusIcon size={15} />
                </motion.span>
              </BarButton>
              <span
                style={{ width: 1, height: 20, background: 'var(--glass-border)', margin: '0 2px' }}
              />
              <BarButton label="Sticky note" onClick={onSticky}>
                <StickyIcon size={16} />
              </BarButton>
              <BarButton
                label={copied ? 'Copied' : 'Copy'}
                onClick={() => {
                  onCopy();
                  setCopied(true);
                }}
              >
                <CopyIcon size={16} />
              </BarButton>
              {target.mode === 'edit' && (
                <BarButton label="Remove highlight" onClick={onRemove} danger>
                  <TrashIcon size={16} />
                </BarButton>
              )}
            </div>

            <AnimatePresence initial={false}>
              {more && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={transition('smooth')}
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(10, 1fr)',
                      gap: 5,
                      padding: '10px 6px 6px',
                      marginTop: 6,
                      borderTop: '1px solid var(--glass-border)',
                    }}
                  >
                    {HIGHLIGHTS.map((highlight, index) => (
                      <Swatch
                        key={highlight.index}
                        colour={highlight.colour}
                        name={highlight.name}
                        active={target.mode === 'edit' && target.colour === highlight.index}
                        delay={(index % 10) * 0.012 + Math.floor(index / 10) * 0.03}
                        onClick={() => onColour(highlight.index)}
                        large
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

function Swatch({
  colour,
  name,
  active,
  delay,
  large,
  onClick,
}: {
  colour: string;
  name: string;
  active?: boolean;
  delay: number;
  large?: boolean;
  onClick: () => void;
}) {
  const size = large ? 26 : 22;
  return (
    <motion.button
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.18, y: -1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ ...spring.snappy, delay }}
      onClick={onClick}
      aria-label={`Highlight ${name}`}
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: 99,
        background: colour,
        boxShadow: active
          ? '0 0 0 2px var(--bg-elevated), 0 0 0 4px var(--text-primary)'
          : 'inset 0 0 0 1px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.3)',
        justifySelf: 'center',
      }}
    />
  );
}

function BarButton({
  label,
  onClick,
  active,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      transition={spring.snappy}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="row-hover"
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        display: 'grid',
        placeItems: 'center',
        color: danger ? 'var(--bad)' : active ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: active ? 'var(--bg-selected)' : 'transparent',
      }}
    >
      {children}
    </motion.button>
  );
}
