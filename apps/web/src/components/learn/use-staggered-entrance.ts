import { useEffect } from 'react';
import styles from '@/styles/learn.module.css';

const ENTRANCE_CLASSES = [
  'stat-card',
  'flashcard-filters',
  'mode-selector',
  'flashcard-container',
  'progress-container',
  'flashcard-actions',
];

/** Fades the learn page blocks in one after another (0.1 s apart) when the session opens. */
export function useStaggeredEntrance(): void {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(
      ENTRANCE_CLASSES.map((name) => `.${CSS.escape(styles[name])}`).join(', '),
    );
    elements.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      el.style.transitionDelay = `${i * 0.1}s`;
    });

    const id = setTimeout(() => {
      elements.forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    }, 100);
    return () => clearTimeout(id);
  }, []);
}
