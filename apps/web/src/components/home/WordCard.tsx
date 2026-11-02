'use client';

import { useEffect, useRef, type MouseEvent } from 'react';
import styles from '@/styles/auth.module.css';

const RESET_TRANSITION = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
const RESET_MS = 800;
const FLIP_MS = 1000;

interface WordCardProps {
  word: string;
  pronunciation: string;
  definition: string;
  example: string;
}

/** Tilts with the mouse position and flips on click; the transform is set inline like the old home.js */
export function WordCard({ word, pronunciation, definition, example }: WordCardProps) {
  const flipping = useRef(false);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (flipping.current) return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = (y - rect.height / 2) / 10;
    const rotateY = (rect.width / 2 - x) / 10;
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave = (e: MouseEvent<HTMLDivElement>) => {
    if (flipping.current) return;
    const card = e.currentTarget;
    card.style.transition = RESET_TRANSITION;
    card.style.transform = 'rotateX(0) rotateY(0)';
    later(() => {
      card.style.transition = '';
    }, RESET_MS);
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    flipping.current = true;
    card.style.transform = card.style.transform.includes('rotateY(180deg)')
      ? 'rotateY(0deg)'
      : 'rotateY(180deg)';
    later(() => {
      flipping.current = false;
    }, FLIP_MS);
  };

  return (
    <div
      className={styles['word-card']}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className={styles['word-card-front']}>
        <h3>{word}</h3>
        <div className={styles['word-pronunciation']}>{pronunciation}</div>
      </div>
      <div className={styles['word-card-back']}>
        <p className={styles['word-definition']}>{definition}</p>
        <p className={styles['word-example']}>{example}</p>
      </div>
    </div>
  );
}
