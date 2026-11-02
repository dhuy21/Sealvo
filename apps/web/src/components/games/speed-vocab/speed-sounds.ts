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

/** Rising C5-E5-G5 arpeggio. */
export function playSuccessSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.setValueAtTime(523, ctx.currentTime);
  oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
  oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);

  gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.3);
}

/** Descending low tone. */
export function playErrorSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.setValueAtTime(300, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.6);

  gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.6);
}
