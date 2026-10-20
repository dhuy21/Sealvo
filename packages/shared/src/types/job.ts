/** Status of a background job (GET /jobs/:id and its stream) */
export type JobStatus = 'pending' | 'processing' | 'retrying' | 'completed' | 'failed';

export interface JobProgress {
  current: number;
  total: number;
  phase: string;
}
