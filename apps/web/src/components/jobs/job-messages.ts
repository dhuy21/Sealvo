import type { JobUpdate } from '@/lib/job-stream';

/** Persistent progress text for a processing job, or null when there is nothing to show. */
export function progressMessage(job: JobUpdate): string | null {
  if (job.status !== 'processing' || !job.progress) return null;
  const { phase, current, total } = job.progress;
  if (phase === 'parsing') return 'Préparation des données...';
  if (phase === 'gemini') return 'Analyse IA en cours...';
  if (phase === 'saving') {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    return `Enregistrement... ${pct}%`;
  }
  return null;
}

export function completedMessage(job: JobUpdate): string {
  const r = job.result ?? {};
  return `${r.imported || 0} mot(s) importé(s). ${r.errors || 0} erreur(s).`;
}

export function failedMessage(job: JobUpdate): string {
  return job.error || 'Le traitement a échoué';
}

export const STREAM_UNAVAILABLE_MESSAGE = 'Traitement en cours. Veuillez rafraîchir la page.';
