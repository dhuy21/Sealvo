import { useCallback, useEffect, useRef, useState } from 'react';
import { cellKey, type CellRef } from './grid';

const NO_CELLS = new Set<string>();

/** Toggles the hinted cells on and off every 200 ms, 3 flashes in total. */
export function useHintFlash() {
  const [flashing, setFlashing] = useState<Set<string>>(NO_CELLS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const flash = useCallback((cells: CellRef[]) => {
    clearInterval(intervalRef.current);
    const keys = new Set(cells.map((c) => cellKey(c.row, c.col)));
    let count = 0;
    intervalRef.current = setInterval(() => {
      count++;
      if (count >= 6) {
        clearInterval(intervalRef.current);
        setFlashing(NO_CELLS);
      } else {
        setFlashing(count % 2 === 1 ? keys : NO_CELLS);
      }
    }, 200);
  }, []);

  return { flashing, flash };
}
