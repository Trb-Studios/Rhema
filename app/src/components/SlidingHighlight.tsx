import { useLayoutEffect, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { motion } from 'framer-motion';
import { spring } from '../lib/motion';

/**
 * The pill behind the selected tab, sliding from one tab to the next.
 *
 * It measures the selected element and springs to it, rather than using a shared layout
 * animation. Shared layout animations inside something that animates away — a panel, a
 * sheet, the palette — kept that thing mounted after it closed, invisible and catching
 * every click in the window.
 *
 * The container must be positioned, and the selected child marked `data-active="true"`.
 */
export function SlidingHighlight({
  container,
  activeKey,
  style,
}: {
  container: RefObject<HTMLElement>;
  /** Anything that changes when the selection does. */
  activeKey: unknown;
  style?: CSSProperties;
}) {
  const [box, setBox] = useState<{ x: number; y: number; width: number; height: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const measure = () => {
      const active = root.querySelector<HTMLElement>('[data-active="true"]');
      setBox(
        active
          ? {
              x: active.offsetLeft,
              y: active.offsetTop,
              width: active.offsetWidth,
              height: active.offsetHeight,
            }
          : null,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [container, activeKey]);

  if (!box) return null;

  return (
    <motion.span
      aria-hidden="true"
      initial={false}
      animate={{ x: box.x, y: box.y, width: box.width, height: box.height }}
      transition={spring.snappy}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}
