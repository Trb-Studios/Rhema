/**
 * Icons.
 *
 * The set lives in design/icons as a single sprite: two-tone line icons on a 24px grid,
 * an ink outline over a soft tan fill, with gold for AI and streak. The outline follows
 * `currentColor`, so an icon takes the colour of the text around it.
 *
 * `npm run icons:sync` copies design/icons/sprite.svg into app/public. The sprite is
 * injected once at startup so every icon is a single `<use>` reference.
 */

import { useEffect } from 'react';

let spriteLoaded = false;

/** Injects the sprite once, so `<use href="#i-home">` resolves anywhere in the app. */
export function useIconSprite() {
  useEffect(() => {
    if (spriteLoaded) return;
    spriteLoaded = true;

    fetch('/icons/sprite.svg')
      .then((response) => response.text())
      .then((markup) => {
        const holder = document.createElement('div');
        holder.style.display = 'none';
        holder.innerHTML = markup;
        document.body.prepend(holder);
      })
      .catch(() => {
        // An icon that fails to load leaves a blank space; labels carry the meaning.
      });
  }, []);
}

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
      style={{ flex: 'none' }}
    >
      <use href={`#i-${name}`} />
    </svg>
  );
}
