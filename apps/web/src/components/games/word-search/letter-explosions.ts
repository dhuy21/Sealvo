import styles from '@/styles/games/word-search.module.css';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const pick = <T>(items: readonly T[] | string): T =>
  items[Math.floor(Math.random() * items.length)] as T;

function spawn(
  bg: HTMLElement,
  className: string,
  text: string,
  left: string,
  top: string,
  lifetime: number,
  color?: string,
): HTMLDivElement {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  el.style.left = left;
  el.style.top = top;
  if (color) el.style.color = color;
  bg.appendChild(el);
  setTimeout(() => el.remove(), lifetime);
  return el;
}

const BURST_COLORS = [
  'rgba(239, 68, 68, 0.6)',
  'rgba(245, 158, 11, 0.6)',
  'rgba(34, 197, 94, 0.6)',
  'rgba(99, 102, 241, 0.6)',
  'rgba(139, 92, 246, 0.6)',
];

const SPIRAL_COLORS = [
  'rgba(239, 68, 68, 0.7)',
  'rgba(245, 158, 11, 0.7)',
  'rgba(34, 197, 94, 0.7)',
  'rgba(99, 102, 241, 0.7)',
  'rgba(139, 92, 246, 0.7)',
  'rgba(236, 72, 153, 0.7)',
];

const CELEBRATION_COLORS = [
  'rgba(34, 197, 94, 0.8)',
  'rgba(16, 185, 129, 0.8)',
  'rgba(5, 150, 105, 0.8)',
  'rgba(52, 211, 153, 0.8)',
];

export function createLetterExplosionBackground(): HTMLDivElement {
  const bg = document.createElement('div');
  bg.className = styles['letter-explosion-background'];
  Object.assign(bg.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '-1',
    overflow: 'hidden',
  });
  document.body.appendChild(bg);
  return bg;
}

export function createRandomLetterBurst(bg: HTMLElement): void {
  const count = 5 + Math.floor(Math.random() * 8);
  const centerX = 20 + Math.random() * 60;
  const centerY = 20 + Math.random() * 60;

  for (let i = 0; i < count; i++) {
    const el = spawn(
      bg,
      styles['letter-burst'],
      pick(LETTERS),
      `${centerX}%`,
      `${centerY}%`,
      2000,
      pick(BURST_COLORS),
    );
    el.style.setProperty('--burst-x', `${(Math.random() - 0.5) * 300}px`);
    el.style.setProperty('--burst-y', `${(Math.random() - 0.5) * 300}px`);
  }
}

function createExplodingLetters(bg: HTMLElement, count: number, stagger: number): void {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      spawn(
        bg,
        styles['exploding-letter'],
        pick(LETTERS),
        `${Math.random() * 100}%`,
        `${Math.random() * 100}%`,
        3000,
      );
    }, i * stagger);
  }
}

export function createRandomExplodingLetters(bg: HTMLElement): void {
  createExplodingLetters(bg, 3 + Math.floor(Math.random() * 5), 200);
}

export function createRandomSpiralLetters(bg: HTMLElement): void {
  const count = 2 + Math.random() * 4;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      spawn(
        bg,
        styles['letter-spiral'],
        pick(LETTERS),
        `${20 + Math.random() * 60}%`,
        `${20 + Math.random() * 60}%`,
        4000,
        pick(SPIRAL_COLORS),
      );
    }, i * 300);
  }
}

export function createWordFoundExplosion(
  bg: HTMLElement,
  word: string,
  centerX: number,
  centerY: number,
): void {
  spawn(bg, styles['letter-explosion-trigger'], '', `${centerX}px`, `${centerY}px`, 1000);

  const letters = word.toUpperCase().split('');
  letters.forEach((letter, index) => {
    setTimeout(() => {
      const angle = (index / letters.length) * 2 * Math.PI;
      const radius = 50 + Math.random() * 30;
      spawn(
        bg,
        styles['word-found-letter-celebration'],
        letter,
        `${centerX + Math.cos(angle) * radius}px`,
        `${centerY + Math.sin(angle) * radius}px`,
        2000,
      );
    }, index * 100);
  });

  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      spawn(
        bg,
        styles['letter-spiral'],
        pick(LETTERS),
        `${centerX + (Math.random() - 0.5) * 100}px`,
        `${centerY + (Math.random() - 0.5) * 100}px`,
        4000,
        pick(CELEBRATION_COLORS),
      );
    }, i * 150);
  }
}

export function createGameStartExplosion(bg: HTMLElement): void {
  createExplodingLetters(bg, 20, 100);
}
