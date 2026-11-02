import { cx } from '@/lib/css-module';
import styles from '@/styles/games/flash-match.module.css';

const BUBBLE_GROUPS = [
  { size: 'large', colors: ['', 'blue'], baseDuration: 12 },
  { size: 'medium', colors: ['', 'purple', 'pink'], baseDuration: 9 },
  { size: 'small', colors: ['', 'blue', 'purple', 'pink'], baseDuration: 6 },
  { size: 'tiny', colors: ['', 'pink', 'blue'], baseDuration: 4 },
];

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const hardwareAccelerated = { willChange: 'transform', transform: 'translateZ(0)' };

/** Randomized once per page load: decorations must not move on each re-render. */
const BUBBLES = [
  ...BUBBLE_GROUPS.flatMap(({ size, colors, baseDuration }) =>
    colors.map((color) => ({
      className: cx(styles, 'bubble', size, color),
      style: {
        left: `${Math.random() * 90 + 5}%`,
        animationDelay: `${Math.random() * 10}s`,
        animationDuration: `${baseDuration + (Math.random() * 3 - 1.5)}s`,
        ...hardwareAccelerated,
      },
    })),
  ),
  ...Array.from({ length: 4 }, () => {
    const color = pick(['', 'purple', 'blue']);
    return {
      className: cx(styles, 'bubble', pick(['tiny', 'small']), color),
      style: {
        left: `${Math.random() * 90 + 5}%`,
        animationDelay: `${Math.random() * 12}s`,
        animationDuration: `${Math.random() * 4 + 4}s`,
        ...hardwareAccelerated,
      },
    };
  }),
];

export function Bubbles() {
  return BUBBLES.map((bubble, i) => (
    <div key={i} className={bubble.className} style={bubble.style} />
  ));
}
