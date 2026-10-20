import { useEffect, useEffectEvent, useRef, useState, type RefObject } from 'react';
import { DIRECTIONS, type CellRef } from './grid';

function canExtend(cells: CellRef[], row: number, col: number): boolean {
  const last = cells[cells.length - 1];
  const rowDiff = row - last.row;
  const colDiff = col - last.col;

  const isValidDirection = DIRECTIONS.some(
    ([dx, dy]) =>
      dx === Math.sign(rowDiff) &&
      dy === Math.sign(colDiff) &&
      (Math.abs(rowDiff) === Math.abs(colDiff) || rowDiff === 0 || colDiff === 0),
  );
  if (!isValidDirection) return false;

  if (cells.length > 1) {
    const first = cells[0];
    const dirX = Math.sign(last.row - first.row);
    const dirY = Math.sign(last.col - first.col);
    const newDirX = Math.sign(row - first.row);
    const newDirY = Math.sign(col - first.col);

    if (dirX !== 0 && newDirX !== dirX) return false;
    if (dirY !== 0 && newDirY !== dirY) return false;

    return (
      (dirX === 0 && newDirX === 0) ||
      (dirY === 0 && newDirY === 0) ||
      Math.abs(row - first.row) === Math.abs(col - first.col)
    );
  }
  return true;
}

/**
 * Drag-selection of aligned grid cells. The selection ends on mouseup/touchend
 * anywhere on the page and is handed to `onComplete`.
 */
export function useCellSelection(
  activeRef: RefObject<boolean>,
  onComplete: (cells: CellRef[]) => void,
) {
  const [selected, setSelectedState] = useState<CellRef[]>([]);
  const selectedRef = useRef<CellRef[]>([]);
  const isSelectingRef = useRef(false);

  const setSelected = (cells: CellRef[]) => {
    selectedRef.current = cells;
    setSelectedState(cells);
  };

  const start = (row: number, col: number) => {
    if (!activeRef.current) return;
    isSelectingRef.current = true;
    setSelected([{ row, col }]);
  };

  const extend = (row: number, col: number) => {
    const cells = selectedRef.current;
    if (!activeRef.current || cells.length === 0) return;

    const existingIdx = cells.findIndex((c) => c.row === row && c.col === col);
    if (existingIdx !== -1) {
      if (existingIdx < cells.length - 1) setSelected(cells.slice(0, existingIdx + 1));
      return;
    }
    if (canExtend(cells, row, col)) setSelected([...cells, { row, col }]);
  };

  const end = () => {
    isSelectingRef.current = false;
    const cells = selectedRef.current;
    if (!activeRef.current || cells.length === 0) return;
    setSelected([]);
    onComplete(cells);
  };

  const touchMove = (e: React.TouchEvent) => {
    if (!isSelectingRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el instanceof HTMLElement && el.dataset.row && el.dataset.col) {
      extend(parseInt(el.dataset.row), parseInt(el.dataset.col));
    }
  };

  const onDocumentRelease = useEffectEvent(end);

  useEffect(() => {
    const release = () => onDocumentRelease();
    document.addEventListener('mouseup', release);
    document.addEventListener('touchend', release);
    return () => {
      document.removeEventListener('mouseup', release);
      document.removeEventListener('touchend', release);
    };
  }, []);

  return { selected, start, extend, end, touchMove };
}
