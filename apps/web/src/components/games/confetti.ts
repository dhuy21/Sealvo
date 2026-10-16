import confetti from 'canvas-confetti';

/** Random fireworks bursts from both sides (Test Prononciation, Word Search). */
export function launchFireworks() {
  const duration = 15 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);

    const particleCount = 50 * (timeLeft / duration);
    confetti({ ...defaults, particleCount, origin: { x: Math.random() * 0.2 + 0.1, y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: Math.random() * 0.2 + 0.7, y: Math.random() - 0.2 } });
  }, 250);
}

/** Continuous side cannons (Word Scramble). */
export function launchSideCannons() {
  const end = Date.now() + 15 * 1000;
  const colors = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1'];

  (function frame() {
    confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/** Golden stars (Phrase Completion). */
export function launchStars() {
  const duration = 15 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = {
    spread: 360, ticks: 50, gravity: 0, decay: 0.94, startVelocity: 30,
    shapes: ['star' as const],
    colors: ['FFE400', 'FFBD00', 'E89400', 'FFCA6C', 'FDFFB8'],
  };

  const interval = setInterval(() => {
    if (Date.now() >= animationEnd) return clearInterval(interval);
    confetti({ ...defaults, particleCount: 40, scalar: 1.2 });
    confetti({ ...defaults, particleCount: 10, scalar: 0.75, shapes: ['circle'] });
  }, 2000);
}

/** Fiery circles (Speed Vocab). */
export function launchEmbers() {
  const duration = 15 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = {
    spread: 360, ticks: 100, gravity: 0, decay: 0.94, startVelocity: 30,
    shapes: ['circle' as const],
    colors: ['FF0000', 'FF7F00', 'FFFF00', 'FFA500', 'FF4500'],
  };

  const interval = setInterval(() => {
    if (Date.now() >= animationEnd) return clearInterval(interval);
    confetti({ ...defaults, particleCount: 50, scalar: 2 });
    confetti({ ...defaults, particleCount: 25, scalar: 2 });
  }, 600);
}
