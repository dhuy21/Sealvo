import type { CSSProperties } from 'react';
import { cx } from '@/lib/css-module';
import styles from '@/styles/games/test-pronun.module.css';

const WAVE_COLORS = [
  'rgba(106, 17, 203, 0.15)',
  'rgba(37, 117, 252, 0.12)',
  'rgba(139, 92, 246, 0.1)',
  'rgba(106, 17, 203, 0.08)',
  'rgba(37, 117, 252, 0.1)',
];

/** `idle` keeps the stylesheet values; the other modes are the inline overrides the old page applied. */
export type SoundBackgroundMode = 'idle' | 'listening' | 'normal';

function waveStyle(mode: SoundBackgroundMode, index: number): CSSProperties | undefined {
  if (mode === 'listening') return { animationDuration: '2s', borderColor: 'rgba(229, 62, 62, 0.2)' };
  if (mode === 'normal') {
    return { animationDuration: '3s', borderColor: WAVE_COLORS[index] || 'rgba(106, 17, 203, 0.1)' };
  }
  return undefined;
}

export function SoundBackground({ mode }: { mode: SoundBackgroundMode }) {
  const visualizerStyle =
    mode === 'idle' ? undefined : { opacity: mode === 'listening' ? '0.6' : '0.3' };
  const barStyle =
    mode === 'idle' ? undefined : { animationDuration: mode === 'listening' ? '0.8s' : '1.5s' };

  return (
    <>
      {/* Recording Waves */}
      <div className={cx(styles, 'recording-waves', mode === 'listening' && 'active')}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className={cx(styles, 'recording-ring')} />
        ))}
      </div>

      {/* Audio Visualizer Background */}
      <div className={cx(styles, 'audio-visualizer')} style={visualizerStyle}>
        {Array.from({ length: 25 }, (_, i) => (
          <div key={i} className={cx(styles, 'visualizer-bar')} style={barStyle} />
        ))}
      </div>

      {/* Sound Waves Background */}
      <div className={cx(styles, 'sound-waves')}>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className={cx(styles, 'sound-wave')} style={waveStyle(mode, i)} />
        ))}
      </div>
    </>
  );
}
