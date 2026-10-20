import type { MouseEvent } from 'react';
import styles from '@/styles/learn.module.css';

/** Short press feedback (`.button-press`) on mousedown. */
export function animateButtonPress(e: MouseEvent<HTMLElement>): void {
  const button = e.currentTarget;
  button.classList.add(styles['button-press']);
  setTimeout(() => button.classList.remove(styles['button-press']), 150);
}
