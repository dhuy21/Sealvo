'use client';

import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 500;

/** Counts from the displayed value to `value` over 500 ms. */
export function AnimatedCounter({ value, initial = 0 }: { value: number; initial?: number }) {
  const [display, setDisplay] = useState(initial);
  const displayRef = useRef(initial);

  useEffect(() => {
    const start = displayRef.current;
    if (start === value) return;
    const startTime = performance.now();
    let frame = 0;

    const tick = (timestamp: number) => {
      const t = Math.min((timestamp - startTime) / DURATION_MS, 1);
      const next = t < 1 ? Math.floor(start + (value - start) * t) : value;
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{display}</>;
}
