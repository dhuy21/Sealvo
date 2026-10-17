import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

type FeedbackType = 'suggestion' | 'bug' | 'question' | 'appreciation' | 'other';

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
