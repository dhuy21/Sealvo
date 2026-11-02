import { useEffect, useEffectEvent, useState } from 'react';

/** Seconds left, ticking down every second while `active`; `onTimeUp` runs when it reaches 0 while `active`. */
export function useCountdownTimer(active: boolean, onTimeUp: () => void) {
  const [timer, setTimer] = useState(0);
  const timeUp = useEffectEvent(onTimeUp);
  const ticking = active && timer > 0;

  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [ticking]);

  useEffect(() => {
    if (active && timer === 0) timeUp();
  }, [active, timer]);

  return [timer, setTimer] as const;
}
