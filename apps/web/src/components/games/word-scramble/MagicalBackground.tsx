import { cx } from '@/lib/css-module';
import styles from '@/styles/games/word-scramble.module.css';

const rand = (min: number, range: number) => min + Math.random() * range;

/** [left, top] in %: corners and edges first, then the centre, then anywhere. */
function orbPosition(index: number): [number, number] {
  switch (index) {
    case 0: return [rand(0, 25), rand(0, 25)];
    case 1: return [rand(75, 25), rand(0, 25)];
    case 2: return [rand(0, 25), rand(75, 25)];
    case 3: return [rand(75, 25), rand(75, 25)];
    case 4: return [rand(35, 30), rand(0, 20)];
    case 5: return [rand(35, 30), rand(80, 20)];
    case 8: return [rand(40, 20), rand(40, 20)];
    case 9: return [rand(20, 25), rand(25, 50)];
    case 10: return [rand(55, 25), rand(25, 50)];
    case 11: return [rand(25, 50), rand(20, 25)];
    default: return [rand(0, 100), rand(0, 100)];
  }
}

/** Randomized once per page load: decorations must not move on each timer re-render. */
const ORB_STYLES = Array.from({ length: 14 }, (_, i) => {
  const [left, top] = orbPosition(i);
  const size = `${40 + Math.random() * 80}px`;
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: size,
    height: size,
    zIndex: Math.floor(Math.random() * 100),
    opacity: 0.3 + Math.random() * 0.5,
    animationDuration: `${15 + Math.random() * 25}s`,
  };
});

const STAR_STYLES = Array.from({ length: 15 }, () => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  fontSize: `${12 + Math.random() * 12}px`,
  zIndex: Math.floor(Math.random() * 10) - 3,
  opacity: 0.3 + Math.random() * 0.7,
  animationDelay: `${Math.random() * 8}s`,
  animationDuration: `${2 + Math.random() * 6}s`,
}));

export function MagicalBackground() {
  return (
    <div className={cx(styles, 'magical-background')}>
      {ORB_STYLES.map((style, i) => (
        <div key={`orb-${i}`} className={cx(styles, 'magic-orb')} style={style} />
      ))}
      {STAR_STYLES.map((style, i) => (
        <div key={`star-${i}`} className={cx(styles, 'magic-star')} style={style}>
          🌟
        </div>
      ))}
    </div>
  );
}
