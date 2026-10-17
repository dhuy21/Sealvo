import { useMutation } from '@tanstack/react-query';
import type { FeedbackType } from '@sealvo/shared';
import api from '@/lib/api';

interface FeedbackPayload {
  type: FeedbackType;
  subject: string;
  content: string;
  email?: string;
}

export function useSendFeedback() {
  return useMutation({
    mutationFn: async (payload: FeedbackPayload) => {
      const { data } = await api.post<{ message: string }>('/feedback', payload);
      return data;
    },
  });
}
