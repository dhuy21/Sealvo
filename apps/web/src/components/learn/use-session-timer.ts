import { useEffect, useState } from 'react';

/** Seconds elapsed since the learning session was opened. */
export function useSessionTimer(): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  return seconds;
}
