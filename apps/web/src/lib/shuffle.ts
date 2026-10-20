/** Fisher–Yates shuffle. Returns a new array; the input is not mutated. */
export function shuffleArray<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Random index in `[0, length)`, other than `current` whenever there is another one. */
export function randomIndexExcept(length: number, current: number): number {
  let index = Math.floor(Math.random() * length);
  while (index === current && length > 1) {
    index = Math.floor(Math.random() * length);
  }
  return index;
}
