'use client';

import { useState, type ReactNode } from 'react';
import { playTts } from '@/lib/tts';
import { useTimeouts } from '@/hooks/use-timeouts';
import { useUnmountSignal } from '@/hooks/use-unmount-signal';
import { cx } from '@/lib/css-module';
import styles from '@/styles/learn.module.css';

export function PronunciationButton({
  text,
  language,
  children,
}: {
  text: string;
  language: string;
  children: ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(false);
  const later = useTimeouts();
  const unmountSignal = useUnmountSignal();

  const speak = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPulse(true);
    later(() => setPulse(false), 500);
    setLoading(true);
    const signal = unmountSignal();
    try {
      await playTts(text, language, signal);
    } catch (error) {
      if (!signal.aborted) console.error('TTS error:', error);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  };

  return (
    <button
      className={cx(styles, 'pronunciation-btn', pulse && 'pulse')}
      disabled={loading}
      onClick={speak}
    >
      {loading ? (
        <>
          <i className="fas fa-spinner fa-spin"></i> En cours
        </>
      ) : (
        <>
          <i className="fas fa-volume-up"></i> {children}
        </>
      )}
    </button>
  );
}
