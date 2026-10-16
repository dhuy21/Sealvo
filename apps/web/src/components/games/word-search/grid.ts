export const GRID_SIZE = 15;
export const DIRECTIONS: [number, number][] = [
  [0, 1], [1, 0], [1, 1], [1, -1],
  [0, -1], [-1, 0], [-1, 1], [-1, -1],
];

export interface CellRef {
  row: number;
  col: number;
}

export const cellKey = (r: number, c: number) => `${r},${c}`;

export function generateGrid(wordList: string[]): { grid: string[][]; placedWords: string[] } {
  const grid: string[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
  const placedWords: string[] = [];

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
    const word = rawWord.toUpperCase().replace(/[^A-Z]/g, '');
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
        placedWords.push(rawWord);
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

  return { grid, placedWords };
}
