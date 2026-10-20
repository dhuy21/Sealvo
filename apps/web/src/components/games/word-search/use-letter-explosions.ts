import { useCallback, useEffect, useRef } from 'react';
import {
  createGameStartExplosion,
  createLetterExplosionBackground,
  createRandomExplodingLetters,
  createRandomLetterBurst,
  createRandomSpiralLetters,
  createWordFoundExplosion,
} from './letter-explosions';

/** Animated letter background for the page lifetime, plus the game-start and word-found bursts. */
export function useLetterExplosions() {
  const bgRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const bg = createLetterExplosionBackground();
    bgRef.current = bg;

    const intervals = [
      setInterval(() => createRandomLetterBurst(bg), 1500 + Math.random() * 2000),
      setInterval(() => createRandomExplodingLetters(bg), 2000 + Math.random() * 3000),
      setInterval(() => createRandomSpiralLetters(bg), 4000 + Math.random() * 4000),
    ];
    const timeouts = [
      setTimeout(() => createRandomLetterBurst(bg), 500),
      setTimeout(() => createRandomExplodingLetters(bg), 1000),
      setTimeout(() => createRandomLetterBurst(bg), 500),
      setTimeout(() => createRandomExplodingLetters(bg), 1200),
      setTimeout(() => createRandomSpiralLetters(bg), 2000),
    ];

    return () => {
      intervals.forEach(clearInterval);
      timeouts.forEach(clearTimeout);
      bg.remove();
      bgRef.current = null;
    };
  }, []);

  const gameStart = useCallback(() => {
    if (bgRef.current) createGameStartExplosion(bgRef.current);
  }, []);

  const wordFound = useCallback((word: string) => {
    if (bgRef.current) {
      createWordFoundExplosion(bgRef.current, word, window.innerWidth / 2, window.innerHeight / 2);
    }
  }, []);

  return { gameStart, wordFound };
}
