import { useCallback, useEffect, useRef } from 'react';
import type { CancelConfetti } from './confetti';

/** Wraps a confetti launcher so every effect it starts is cancelled on unmount. */
export function useCelebration(launch: () => CancelConfetti) {
  const cancelsRef = useRef(new Set<CancelConfetti>());

  useEffect(() => {
    const cancels = cancelsRef.current;
    return () => {
      cancels.forEach((cancel) => cancel());
      cancels.clear();
    };
  }, []);

  return useCallback(() => {
    cancelsRef.current.add(launch());
  }, [launch]);
}
