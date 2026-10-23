/**
 * The screens in the side rail, in order.
 *
 * One place names each screen, its icon, and the line shown on its tile on the Start
 * portal, so the rail and the portal can never drift apart.
 */

export const SCREENS = [
  { id: 'home', label: 'Home', icon: 'home', blurb: 'Where to start' },
  { id: 'read', label: 'Read', icon: 'read', blurb: 'Genesis to Revelation' },
  { id: 'people', label: 'People', icon: 'people', blurb: 'Cards and family trees' },
  { id: 'places', label: 'Places', icon: 'places', blurb: 'Map and journeys' },
  { id: 'words', label: 'Words', icon: 'words', blurb: 'Hebrew and Greek' },
  { id: 'notes', label: 'Notes', icon: 'notes', blurb: 'Notes and highlights' },
  { id: 'plan', label: 'Plan', icon: 'plan', blurb: 'What to read, and when' },
  { id: 'quiz', label: 'Quiz', icon: 'quiz', blurb: 'Test a whole book' },
  { id: 'review', label: 'Review', icon: 'review', blurb: "What's due today" },
  { id: 'settings', label: 'Settings', icon: 'settings', blurb: 'Make it yours' },
] as const;

export type ScreenId = (typeof SCREENS)[number]['id'];

/** Screens that are built. The rest show what is coming rather than a broken page. */
export const BUILT: ScreenId[] = ['home', 'read', 'plan'];
