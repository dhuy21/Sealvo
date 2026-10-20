const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

const FALLING_STAR_COLORS = [
  'rgba(255, 255, 255, 0.9)',
  'rgba(147, 197, 253, 0.8)',
  'rgba(196, 181, 253, 0.7)',
  'rgba(251, 191, 36, 0.8)',
  'rgba(34, 197, 94, 0.7)',
];

/** One ⭐ falling from the top of the screen with a drift and a spin; removed once it has fallen. */
export function createFallingStar(className: string): HTMLElement {
  const star = document.createElement('div');
  star.className = className;
  star.textContent = '⭐';
  star.style.left = `${Math.random() * 100}%`;
  star.style.top = '-50px';
  star.style.color = pick(FALLING_STAR_COLORS);
  star.style.fontSize = `${0.8 + Math.random() * 0.8}rem`;
  document.body.appendChild(star);

  const rotation = Math.random() * 720;
  const drift = (Math.random() - 0.5) * 200;
  const animation = star.animate(
    [
      { transform: 'translateY(0) translateX(0) rotate(0deg) scale(0.5)', opacity: 0 },
      {
        transform: `translateY(50px) translateX(0) rotate(${rotation * 0.1}deg) scale(1)`,
        opacity: 1,
        offset: 0.1,
      },
      {
        transform: `translateY(${window.innerHeight + 100}px) translateX(${drift}px) rotate(${rotation}deg) scale(0.3)`,
        opacity: 0,
      },
    ],
    { duration: 3000 + Math.random() * 4000, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
  );
  animation.onfinish = () => star.remove();
  return star;
}

/** Eight star symbols bursting around the screen center after an answer. */
export function createStarParticles(isCorrect: boolean): void {
  const colors = isCorrect
    ? ['#93c5fd', '#c4b5fd', '#fbbf24', '#34d399']
    : ['#ef4444', '#f59e0b', '#8b5cf6', '#6366f1'];
  const symbols = isCorrect ? ['⭐', '✨', '🌟', '💫'] : ['💥', '☄️', '🌠', '⚡'];

  for (let i = 0; i < 8; i++) {
    const particle = document.createElement('div');
    particle.className = 'star-particle';
    particle.style.position = 'fixed';
    particle.style.fontSize = '1.8rem';
    particle.style.color = pick(colors);
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '1000';
    particle.textContent = pick(symbols);
    particle.style.left = `${window.innerWidth / 2 + (Math.random() - 0.5) * 300}px`;
    particle.style.top = `${window.innerHeight / 2 + (Math.random() - 0.5) * 300}px`;
    document.body.appendChild(particle);

    const animation = particle.animate(
      [
        { transform: 'scale(0) rotate(0deg)', opacity: 1, filter: 'brightness(1)' },
        {
          transform: 'scale(1.5) rotate(180deg)',
          opacity: 0.9,
          filter: 'brightness(1.5)',
          offset: 0.3,
        },
        {
          transform: `scale(0.5) rotate(360deg) translate(${(Math.random() - 0.5) * 400}px, ${(Math.random() - 0.5) * 400}px)`,
          opacity: 0,
          filter: 'brightness(0.5)',
        },
      ],
      { duration: 3000, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
    );
    animation.onfinish = () => particle.remove();
  }
}

/** Glowing circle growing from the screen center: blue for a correct answer, red otherwise. */
export function createConstellationEffect(isCorrect: boolean): void {
  const glow = isCorrect ? '147, 197, 253' : '239, 68, 68';
  const constellation = document.createElement('div');
  constellation.className = isCorrect ? 'constellation-success' : 'constellation-error';
  Object.assign(constellation.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    width: '0',
    height: '0',
    borderRadius: '50%',
    background: isCorrect
      ? 'radial-gradient(circle, rgba(147, 197, 253, 0.3) 0%, rgba(196, 181, 253, 0.2) 50%, transparent 70%)'
      : 'radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, rgba(245, 158, 11, 0.2) 50%, transparent 70%)',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    zIndex: '999',
    boxShadow: `0 0 50px rgba(${glow}, 0.4)`,
  });
  document.body.appendChild(constellation);

  const animation = constellation.animate(
    [
      { width: '0px', height: '0px', opacity: 1, boxShadow: `0 0 0px rgba(${glow}, 0)` },
      {
        width: '600px',
        height: '600px',
        opacity: 0.7,
        boxShadow: `0 0 100px rgba(${glow}, 0.6)`,
        offset: 0.6,
      },
      { width: '800px', height: '800px', opacity: 0, boxShadow: `0 0 150px rgba(${glow}, 0)` },
    ],
    { duration: 2000, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
  );
  animation.onfinish = () => constellation.remove();
}
