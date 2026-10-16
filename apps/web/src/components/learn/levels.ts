export const LEVELS = ['x', 'level_0', 'level_1', 'level_2', 'v'] as const;

export function levelLabel(level: string): string {
  if (level === 'x') return 'x';
  if (level === 'v') return 'v';
  return level.replace('level_', '');
}
