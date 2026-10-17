import confetti from 'canvas-confetti';

/** Every launcher returns a cancel function that stops new bursts and clears the ones on screen. */
export type CancelConfetti = () => void;

function canceller(stopScheduling: () => void): CancelConfetti {
  return () => {
    stopScheduling();
    confetti.reset();
  };
}

/** Random fireworks bursts from both sides (Flash Match, Test Prononciation, Word Search). */
export function launchFireworks(): CancelConfetti {
  const duration = 15 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);

    const particleCount = 50 * (timeLeft / duration);
    confetti({
      ...defaults,
      particleCount,
      origin: { x: Math.random() * 0.2 + 0.1, y: Math.random() - 0.2 },
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: Math.random() * 0.2 + 0.7, y: Math.random() - 0.2 },
    });
  }, 250);
  return canceller(() => clearInterval(interval));
}

/** Slowly falling white snow (Vocab Quiz). */
export function launchSnow(): CancelConfetti {
  const duration = 15 * 1000;
  const animationEnd = Date.now() + duration;
  let skew = 1;
  let frameId = 0;
  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  (function frame() {
    const timeLeft = animationEnd - Date.now();
    const ticks = Math.max(200, 500 * (timeLeft / duration));
    skew = Math.max(0.8, skew - 0.001);

    confetti({
      particleCount: 1,
      startVelocity: 0,
      ticks,
      origin: { x: Math.random(), y: Math.random() * skew - 0.2 },
      colors: ['#ffffff'],
      shapes: ['circle'],
      gravity: randomInRange(0.4, 0.6),
      scalar: randomInRange(0.4, 1),
      drift: randomInRange(-0.4, 0.4),
    });

    if (timeLeft > 0) frameId = requestAnimationFrame(frame);
  })();
  return canceller(() => cancelAnimationFrame(frameId));
}

/** Continuous side cannons (Word Scramble). */
export function launchSideCannons(): CancelConfetti {
  const end = Date.now() + 15 * 1000;
  const colors = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1'];
  let frameId = 0;

  (function frame() {
    confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) frameId = requestAnimationFrame(frame);
  })();
  return canceller(() => cancelAnimationFrame(frameId));
}

/** Golden stars (Phrase Completion). */
export function launchStars(): CancelConfetti {
  const duration = 15 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = {
    spread: 360,
    ticks: 50,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    shapes: ['star' as const],
    colors: ['FFE400', 'FFBD00', 'E89400', 'FFCA6C', 'FDFFB8'],
  };

  const interval = setInterval(() => {
    if (Date.now() >= animationEnd) return clearInterval(interval);
    confetti({ ...defaults, particleCount: 40, scalar: 1.2 });
    confetti({ ...defaults, particleCount: 10, scalar: 0.75, shapes: ['circle'] });
  }, 2000);
  return canceller(() => clearInterval(interval));
}

/** Fiery circles (Speed Vocab). */
export function launchEmbers(): CancelConfetti {
  const duration = 15 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = {
    spread: 360,
    ticks: 100,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    shapes: ['circle' as const],
    colors: ['FF0000', 'FF7F00', 'FFFF00', 'FFA500', 'FF4500'],
  };

  const interval = setInterval(() => {
    if (Date.now() >= animationEnd) return clearInterval(interval);
    confetti({ ...defaults, particleCount: 50, scalar: 2 });
    confetti({ ...defaults, particleCount: 25, scalar: 2 });
    confetti({ ...defaults, particleCount: 10, scalar: 2 });
  }, 600);
  return canceller(() => clearInterval(interval));
}
