import { useState, useCallback, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth.store';
import { useQueryClient } from '@tanstack/react-query';

export interface JobProgress {
  id: string;
  status: 'pending' | 'processing' | 'retrying' | 'completed' | 'failed';
  progress?: { current: number; total: number; phase: string } | null;
  result?: { imported: number; total: number } | null;
  error?: string | null;
  message?: string;
}

export function useImportFile(packageId: number) {
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState<JobProgress | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Bumped by cleanup so in-flight responses from a previous upload/poll are ignored.
  const generationRef = useRef(0);
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  const cleanup = useCallback(() => {
    generationRef.current += 1;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const upload = useCallback(
    async (file: File) => {
      cleanup();
      const generation = generationRef.current;
      setUploading(true);
      setJob(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await api.post(`/packages/${packageId}/import`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (generation !== generationRef.current) return;

        if (!data.async) {
          // Synchronous import completed
          setJob({ id: '', status: 'completed', message: data.message });
          void qc.invalidateQueries({ queryKey: ['words', packageId] });
          void qc.invalidateQueries({ queryKey: ['dashboard'] });
          return;
        }

        // Poll job status (EventSource doesn't support Bearer auth headers)
        const jobId = data.jobId as string;
        setJob({ id: jobId, status: 'pending' });

        intervalRef.current = setInterval(async () => {
          try {
            const { data: jobData } = await api.get(`/jobs/${jobId}`);
            if (generation !== generationRef.current) return;
            const j = jobData.job as JobProgress;
            setJob(j);
            if (j.status === 'completed' || j.status === 'failed') {
              cleanup();
              void qc.invalidateQueries({ queryKey: ['words', packageId] });
              void qc.invalidateQueries({ queryKey: ['dashboard'] });
            }
          } catch (err) {
            if (generation !== generationRef.current) return;
            cleanup();
            setJob({
              id: jobId,
              status: 'failed',
              error: getApiErrorMessage(err, "Impossible de suivre l'import"),
            });
          }
        }, 1000);
      } catch (err) {
        if (generation !== generationRef.current) return;
        setJob({
          id: '',
          status: 'failed',
          error: getApiErrorMessage(err, "Erreur lors de l'import"),
        });
      } finally {
        setUploading(false);
      }
    },
    [packageId, cleanup, qc, accessToken],
  );

  const reset = useCallback(() => {
    setJob(null);
    cleanup();
  }, [cleanup]);

  return { upload, uploading, job, reset };
}
