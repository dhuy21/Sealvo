import { useEffect, useEffectEvent } from 'react';

/** Arrows navigate, Space flips, 1 marks "À revoir", 2 marks "Appris". */
export function useLearnShortcuts({
  hasCards,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onFlip,
  onMark,
}: {
  hasCards: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onFlip: () => void;
  onMark: (level: 0 | 2) => void;
}) {
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (!hasCards) return;

    if (e.code === 'ArrowLeft' && canGoPrev) {
      onPrev();
    } else if (e.code === 'ArrowRight' && canGoNext) {
      onNext();
    } else if (e.code === 'Space') {
      onFlip();
      e.preventDefault();
    } else if (e.code === 'Digit1' || e.code === 'Numpad1') {
      onMark(0);
    } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
      onMark(2);
    }
  });

  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKeyDown(e);
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, []);
}
