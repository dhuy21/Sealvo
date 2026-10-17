import { useEffect } from 'react';
import { createFallingStar } from './phrase-effects';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/phrase-completion.module.css';

/** Randomized once per page load: decorations must not move on each timer re-render. */
const CELESTIAL_STYLES = Array.from({ length: 10 }, () => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  animationDelay: `${Math.random() * 8}s`,
  animationDuration: `${6 + Math.random() * 4}s`,
}));

/** Groups of 3-6 stars every 0.4-1.2 s while the page is open. */
function useFallingStars() {
  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const stars = new Set<HTMLElement>();
    const later = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };
    const createGroup = () => {
      // Hidden tabs keep firing timers but never finish animations: stars would pile up
      if (document.hidden) return;
      const count = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        later(() => {
          const star = createFallingStar(cx(styles, 'random-falling-star'));
          stars.add(star);
          star.getAnimations()[0]?.addEventListener('finish', () => stars.delete(star));
        }, Math.random() * 500);
      }
    };
    const scheduleNextGroup = () =>
      later(
        () => {
          createGroup();
          scheduleNextGroup();
        },
        400 + Math.random() * 800,
      );

    createGroup();
    scheduleNextGroup();
    return () => {
      timers.forEach(clearTimeout);
      stars.forEach((star) => star.remove());
    };
  }, []);
}

export function StarryBackground() {
  useFallingStars();
  return (
    <>
      {/* Starry Focus Rings */}
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={`ring-${i}`}
          className={cx(styles, 'starry-focus-ring')}
          style={{ animationDelay: `${i * 1.5}s` }}
        />
      ))}
      {/* Floating Celestial Elements */}
      {CELESTIAL_STYLES.map((style, i) => (
        <div key={`cel-${i}`} className={cx(styles, 'floating-celestial-element')} style={style}>
          ⭐
        </div>
      ))}
    </>
  );
}
