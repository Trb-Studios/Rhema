import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders floating things — popovers, toolbars, hover cards — at the top of the
 * document rather than where they are written.
 *
 * They are positioned against the window. Inside a screen that is mid-transition, an
 * ancestor with a transform or filter becomes the thing "fixed" is measured from, and
 * every card landed a sidebar's width away from the word it belonged to.
 */
export function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
