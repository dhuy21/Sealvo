import { useState, useCallback, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth.store';
import { useQueryClient } from '@tanstack/react-query';

export interface JobProgress {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'stream_unavailable';
  progress?: number;
  total?: number;
  successCount?: number;
  errorCount?: number;
  error?: string;
  message?: string;
}

export function useImportFile(packageId: number) {
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState<JobProgress | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      setJob(null);
      cleanup();

      try {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await api.post(`/packages/${packageId}/import`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (!data.async) {
          // Synchronous import completed
          setJob({ id: '', status: 'completed', message: data.message });
          void qc.invalidateQueries({ queryKey: ['words', packageId] });
          void qc.invalidateQueries({ queryKey: ['dashboard'] });
          return;
        }

        // Async: connect SSE
        const jobId = data.jobId as string;
        setJob({ id: jobId, status: 'pending' });

        // Poll job status (EventSource doesn't support Bearer auth headers)
        const poll = async () => {
          const interval = setInterval(async () => {
            try {
              const { data: jobData } = await api.get(`/jobs/${jobId}`);
              const j = jobData.job as JobProgress;
              setJob(j);
              if (j.status === 'completed' || j.status === 'failed') {
                clearInterval(interval);
                void qc.invalidateQueries({ queryKey: ['words', packageId] });
                void qc.invalidateQueries({ queryKey: ['dashboard'] });
              }
            } catch {
              clearInterval(interval);
            }
          }, 1000);
        };

        void poll();
      } catch (err) {
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
