import type { activity_phase, activity_status } from '@prisma/client';

/**
 * One bar for the whole job. Gemini fills the first half, saving the second,
 * so the bar does not jump back to zero when saving starts.
 * Only a running job has a bar.
 */
export function activityPercent(
  status: activity_status,
  phase: activity_phase | null,
  current: number | null,
  total: number | null,
): number | null {
  if (status !== 'running') return null;
  const ratio = total && total > 0 ? Math.min(1, Math.max(0, (current ?? 0) / total)) : 0;
  if (phase === 'done') return 100;
  if (phase === 'saving') return Math.round(50 + ratio * 50);
  if (phase === 'gemini') return Math.round(ratio * 50);
  return 0;
}
