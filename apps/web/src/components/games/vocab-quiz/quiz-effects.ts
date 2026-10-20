let audioContext: AudioContext | null | undefined;

function getAudioContext(): AudioContext | null {
  if (audioContext === undefined) {
    try {
      audioContext = new AudioContext();
    } catch {
      audioContext = null;
    }
  }
  return audioContext;
}

export function playSuccessSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator1 = ctx.createOscillator();
  const oscillator2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator1.connect(gainNode);
  oscillator2.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator1.frequency.setValueAtTime(523, ctx.currentTime);
  oscillator1.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
  oscillator1.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
  oscillator2.frequency.setValueAtTime(262, ctx.currentTime);
  oscillator2.frequency.setValueAtTime(330, ctx.currentTime + 0.15);

  gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

  oscillator1.start(ctx.currentTime);
  oscillator1.stop(ctx.currentTime + 0.5);
  oscillator2.start(ctx.currentTime);
  oscillator2.stop(ctx.currentTime + 0.5);
}

export function playErrorSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.setValueAtTime(280, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.5);
  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.5);
}

const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

/** Eight symbols bursting around the screen center. */
export function createLovelyParticles(isCorrect: boolean): void {
  const colors = isCorrect
    ? ['#ffb6c1', '#ffc0cb', '#dda0dd', '#98fb98']
    : ['#ffa07a', '#f0a0a0', '#ffb6c1', '#dda0dd'];
  const symbols = isCorrect ? ['✨', '💫', '🌟', '💖'] : ['💭', '🌸', '🦋', '💝'];

  for (let i = 0; i < 8; i++) {
    const particle = document.createElement('div');
    particle.className = 'lovely-particle';
    particle.style.position = 'fixed';
    particle.style.fontSize = '1.2rem';
    particle.style.color = pick(colors);
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '1000';
    particle.textContent = pick(symbols);
    particle.style.left = `${window.innerWidth / 2 + (Math.random() - 0.5) * 150}px`;
    particle.style.top = `${window.innerHeight / 2 + (Math.random() - 0.5) * 150}px`;
    document.body.appendChild(particle);

    const animation = particle.animate(
      [
        { transform: 'scale(0) rotate(0deg)', opacity: 1 },
        { transform: 'scale(1.2) rotate(180deg)', opacity: 0.9, offset: 0.4 },
        {
          transform: `scale(0) rotate(360deg) translate(${(Math.random() - 0.5) * 200}px, ${(Math.random() - 0.5) * 200}px)`,
          opacity: 0,
        },
      ],
      { duration: 2000, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
    );
    animation.onfinish = () => particle.remove();
  }
}

/** Soft circular wave expanding from the screen center. */
export function createGentleWaveEffect(isCorrect: boolean): void {
  const wave = document.createElement('div');
  wave.className = isCorrect ? 'lovely-success-wave' : 'lovely-error-wave';
  wave.style.position = 'fixed';
  wave.style.top = '50%';
  wave.style.left = '50%';
  wave.style.width = '0';
  wave.style.height = '0';
  wave.style.borderRadius = '50%';
  wave.style.background = isCorrect
    ? 'radial-gradient(circle, rgba(255, 182, 193, 0.3) 0%, transparent 70%)'
    : 'radial-gradient(circle, rgba(255, 160, 122, 0.3) 0%, transparent 70%)';
  wave.style.transform = 'translate(-50%, -50%)';
  wave.style.pointerEvents = 'none';
  wave.style.zIndex = '999';
  document.body.appendChild(wave);

  const animation = wave.animate(
    [
      { width: '0px', height: '0px', opacity: 1 },
      { width: '400px', height: '400px', opacity: 0 },
    ],
    { duration: 1200, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
  );
  animation.onfinish = () => wave.remove();
}
