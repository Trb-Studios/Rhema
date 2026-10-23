/**
 * The 30 highlight colours: ten reds, ten greens, ten blues, light through dark.
 *
 * They carry no built-in meaning. Each one can be named for whatever the person uses it
 * for, and the names live with their data rather than in the code. Highlights draw at
 * 42% over the page, so Scripture stays readable in both themes.
 */

export const HIGHLIGHT_OPACITY = 0.42;

export type Highlight = {
  /** 0 to 29. Stored with the verse, so renaming or restyling never loses a mark. */
  index: number;
  /** The default name, shown until the person renames it. */
  name: string;
  colour: string;
};

const FAMILIES = [
  { label: 'Red', hue: 2 },
  { label: 'Green', hue: 138 },
  { label: 'Blue', hue: 215 },
];

export const HIGHLIGHTS: Highlight[] = FAMILIES.flatMap((family, familyIndex) =>
  Array.from({ length: 10 }, (_, step) => ({
    index: familyIndex * 10 + step,
    name: `${family.label} ${step + 1}`,
    colour: `hsl(${family.hue + step * 3} ${82 - step * 1.5}% ${86 - step * 4.4}%)`,
  })),
);

/** A dozen evenly spread colours, for the strip that appears when a verse is selected. */
export const QUICK_PICKS = [0, 3, 6, 9, 10, 13, 16, 19, 20, 23, 26, 29].map(
  (index) => HIGHLIGHTS[index],
);
