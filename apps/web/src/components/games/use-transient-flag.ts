import { useCallback, useEffect, useRef, useState } from 'react';

/** A flag that turns itself off `ms` after each trigger (for one-shot CSS animation classes). */
export function useTransientFlag(): [boolean, (ms: number) => void] {
  const [on, setOn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const trigger = useCallback((ms: number) => {
    clearTimeout(timerRef.current);
    setOn(true);
    timerRef.current = setTimeout(() => setOn(false), ms);
  }, []);

  return [on, trigger];
}
