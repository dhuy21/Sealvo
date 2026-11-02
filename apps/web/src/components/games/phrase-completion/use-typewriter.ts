import { useCallback, useEffect, useRef } from 'react';

/** Reveals a text one character every `speed` ms through `onText`. */
export function useTypewriter(onText: (text: string) => void, speed = 30) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const stop = useCallback(() => clearInterval(intervalRef.current), []);

  const type = useCallback(
    (text: string) => {
      clearInterval(intervalRef.current);
      let i = 0;
      onText('');
      intervalRef.current = setInterval(() => {
        if (i < text.length) {
          i++;
          onText(text.slice(0, i));
        } else {
          clearInterval(intervalRef.current);
        }
      }, speed);
    },
    [onText, speed],
  );

  return { type, stop };
}
