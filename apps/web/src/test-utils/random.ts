import { vi } from 'vitest';

/** Replaces `Math.random` with a seeded generator (mulberry32) for the current test. */
export function seedRandom(seed: number) {
  let a = seed;
  return vi.spyOn(Math, 'random').mockImplementation(() => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
}

/** Makes `Math.random` return `values` in order for the current test. */
export function mockRandom(...values: number[]) {
  const spy = vi.spyOn(Math, 'random');
  for (const v of values) spy.mockReturnValueOnce(v);
  return spy;
}
