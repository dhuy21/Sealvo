import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface PackageToReview {
  package_id: number;
  package_name: string;
  num_words: number;
}

export interface DashboardStats {
  streak: number;
  totalWords: number;
  learnedWords: number;
  newWords: number;
  islearningWords: number;
  packagesToReview: PackageToReview[];
}

interface DashboardResponse extends DashboardStats {
  success: boolean;
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get<DashboardResponse>('/dashboard');
      return data;
    },
  });
}

interface UpdateProfilePayload {
  username?: string;
  email?: string;
  current_password?: string;
  ava?: number;
}

interface UpdateProfileResponse {
  success: boolean;
  message: string;
  /** Set when an email change awaits confirmation from the new inbox */
  pendingEmail?: string;
}

export function useTestReminder() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ success: boolean; message: string }>('/reminder/test');
      return data;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const { data } = await api.patch<UpdateProfileResponse>('/dashboard/profile', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
