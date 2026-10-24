import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../lib/motion';

const COLOURS = ['#d6c2a5', '#e9b949', '#4cc38a', '#8dbfea', '#f09a92', '#9d8cff', '#ffffff'];

/**
 * A burst of confetti for finishing a round well. Drawn on a canvas so two hundred
 * pieces cost nothing, and skipped entirely when the system asks for less motion.
 */
export function Confetti({ fire }: { fire: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fire || prefersReducedMotion()) return;
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;

    const ratio = window.devicePixelRatio || 1;
    const width = (element.width = element.offsetWidth * ratio);
    const height = (element.height = element.offsetHeight * ratio);

    const pieces = Array.from({ length: 220 }, (_, index) => {
      const fromLeft = index % 2 === 0;
      return {
        x: fromLeft ? width * 0.15 : width * 0.85,
        y: height * 0.55,
        vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 9) * ratio,
        vy: -(9 + Math.random() * 12) * ratio,
        size: (5 + Math.random() * 6) * ratio,
        spin: Math.random() * Math.PI,
        turn: (Math.random() - 0.5) * 0.3,
        colour: COLOURS[index % COLOURS.length],
        shape: index % 3,
      };
    });

    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame += 1;
      context.clearRect(0, 0, width, height);
      for (const piece of pieces) {
        piece.vy += 0.32 * ratio;
        piece.vx *= 0.985;
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.spin += piece.turn;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.spin);
        context.globalAlpha = Math.max(0, 1 - frame / 150);
        context.fillStyle = piece.colour;
        if (piece.shape === 0)
          context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        else if (piece.shape === 1) {
          context.beginPath();
          context.arc(0, 0, piece.size / 3, 0, Math.PI * 2);
          context.fill();
        } else {
          context.beginPath();
          context.moveTo(0, -piece.size / 2);
          context.lineTo(piece.size / 2, piece.size / 2);
          context.lineTo(-piece.size / 2, piece.size / 2);
          context.fill();
        }
        context.restore();
      }
      if (frame < 150) raf = requestAnimationFrame(tick);
      else context.clearRect(0, 0, width, height);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fire]);

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}
