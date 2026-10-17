export const GRID_SIZE = 15;
export const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [-1, -1],
];

export interface CellRef {
  row: number;
  col: number;
}

export const cellKey = (r: number, c: number) => `${r},${c}`;

export const normalizeWord = (word: string) => word.toUpperCase().replace(/[^A-Z]/g, '');

/** Cells of the first occurrence of `word` (already normalized) in the grid, scanning row by row. */
export function findWordInGrid(grid: string[][], word: string): CellRef[] | null {
  const size = grid.length;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      for (const [dx, dy] of DIRECTIONS) {
        const endRow = row + dx * (word.length - 1);
        const endCol = col + dy * (word.length - 1);
        if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;
        const cells = Array.from(word, (_, i) => ({ row: row + dx * i, col: col + dy * i }));
        if (cells.every((c, i) => grid[c.row][c.col] === word[i])) return cells;
      }
    }
  }
  return null;
}

export function generateGrid(wordList: string[]): string[][] {
  const grid: string[][] = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(''));

  function canPlace(word: string, row: number, col: number, dx: number, dy: number): boolean {
    const len = word.length;
    if (row + dx * (len - 1) < 0 || row + dx * (len - 1) >= GRID_SIZE) return false;
    if (col + dy * (len - 1) < 0 || col + dy * (len - 1) >= GRID_SIZE) return false;
    for (let i = 0; i < len; i++) {
      const c = grid[row + dx * i][col + dy * i];
      if (c !== '' && c !== word[i]) return false;
    }
    return true;
  }

  for (const rawWord of wordList) {
    const word = normalizeWord(rawWord);
    if (word.length <= 1 || word.length > GRID_SIZE) continue;

    let placed = false;
    for (let attempt = 0; attempt < 100 && !placed; attempt++) {
      const dirIdx = Math.floor(Math.random() * DIRECTIONS.length);
      const [dx, dy] = DIRECTIONS[dirIdx];
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);

      if (canPlace(word, row, col, dx, dy)) {
        for (let i = 0; i < word.length; i++) {
          grid[row + dx * i][col + dy * i] = word[i];
        }
        placed = true;
      }
    }
  }

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i][j] === '') {
        grid[i][j] = letters.charAt(Math.floor(Math.random() * letters.length));
      }
    }
  }

  return grid;
}
