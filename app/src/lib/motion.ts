/**
 * Motion settings, shared by every animated component.
 *
 * The feel is macOS: springs rather than fixed curves, so movement starts fast,
 * settles softly, and can be interrupted mid-flight without jumping. These numbers
 * come from design/tokens.json and are starting points to tune by feel on a real screen.
 */

export const spring = {
  /** Panels, sidebar, page changes, sheets. No bounce. */
  smooth: { type: 'spring', stiffness: 260, damping: 32, mass: 1 },
  /** Buttons, toggles, the tab indicator, selection. A slight settle. */
  snappy: { type: 'spring', stiffness: 420, damping: 30, mass: 1 },
  /** Rare celebrations, such as finishing a book. */
  bouncy: { type: 'spring', stiffness: 300, damping: 18, mass: 1 },
} as const;

export const duration = {
  instant: 0.09,
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  sheet: 0.45,
} as const;

/** True when Windows asks for less movement. Read it before animating. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * A transition that respects the system setting: the given spring normally,
 * a short fade when the person has asked for reduced motion.
 */
export function transition(preset: keyof typeof spring = 'smooth') {
  return prefersReducedMotion() ? { duration: duration.instant } : spring[preset];
}

/** A view entering: fades in from slightly below. Pair with `transition('smooth')`. */
export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

/** A sheet rising from below with a slight scale, for Settings and the command palette. */
export const sheetVariants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 16, scale: 0.98 },
};

/** A popover growing out of the word that was tapped. */
export const popoverVariants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

/** Buttons and tiles shrink slightly under the pointer and spring back. */
export const pressable = {
  whileHover: { backgroundColor: 'var(--bg-sunken)' },
  whileTap: { scale: 0.97 },
  transition: spring.snappy,
};
