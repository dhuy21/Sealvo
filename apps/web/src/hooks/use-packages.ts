import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Package {
  package_id: number;
  package_name: string;
  package_description: string | null;
  mode: 'private' | 'public' | 'protected';
  is_active: boolean;
  user_id: string;
  username?: string;
}

export function useMyPackages() {
  return useQuery({
    queryKey: ['packages', 'mine'],
    queryFn: async () => {
      const { data } = await api.get<Package[]>('/packages');
      return data;
    },
  });
}

export function usePublicPackages() {
  return useQuery({
    queryKey: ['packages', 'public'],
    queryFn: async () => {
      const { data } = await api.get<Package[]>('/packages/public');
      return data;
    },
  });
}

interface CreatePackageDto {
  package_name: string;
  package_description?: string;
  mode?: 'private' | 'public' | 'protected';
}

interface UpdatePackageDto {
  package_name?: string;
  package_description?: string;
  mode?: 'private' | 'public' | 'protected';
}

export function useCreatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePackageDto) => {
      const { data } = await api.post('/packages', dto);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['packages'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: number; dto: UpdatePackageDto }) => {
      const { data } = await api.patch(`/packages/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['packages'] });
    },
  });
}

export function useDeletePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/packages/${id}`);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['packages'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useTogglePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch<{ message: string; isActive: boolean }>(
        `/packages/${id}/toggle`,
      );
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['packages'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCopyPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`/packages/${id}/copy`);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['packages'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
