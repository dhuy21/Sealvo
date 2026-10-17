import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PackageMode } from '@sealvo/shared';
import api from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface Package {
  package_id: number;
  package_name: string;
  package_description: string | null;
  mode: PackageMode;
  is_active: boolean;
  user_id: string;
  username?: string;
}

export function useMyPackages() {
  return useQuery({
    queryKey: queryKeys.myPackages(),
    queryFn: async () => {
      const { data } = await api.get<Package[]>('/packages');
      return data;
    },
  });
}

export function usePublicPackages() {
  return useQuery({
    queryKey: queryKeys.publicPackages(),
    queryFn: async () => {
      const { data } = await api.get<Package[]>('/packages/public');
      return data;
    },
  });
}

export interface PackageDetail {
  package_id: number;
  package_name: string;
  package_description: string | null;
  mode: PackageMode;
  is_active: boolean;
  username: string;
  isOwner: boolean;
}

export function usePackage(packageId: number | null) {
  return useQuery({
    queryKey: queryKeys.package(packageId),
    queryFn: async () => {
      const { data } = await api.get<PackageDetail>(`/packages/${packageId}`);
      return data;
    },
    enabled: !!packageId,
  });
}

interface CreatePackageDto {
  package_name: string;
  package_description?: string;
  mode?: PackageMode;
}

interface UpdatePackageDto {
  package_name?: string;
  package_description?: string;
  mode?: PackageMode;
}

export function useCreatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreatePackageDto) => {
      const { data } = await api.post('/packages', dto);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.packages() });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
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
    // The name and the active flag are also shown by the dashboard and the game pickers
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.packages() });
      void qc.invalidateQueries({ queryKey: queryKeys.games() });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
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
      void qc.invalidateQueries({ queryKey: queryKeys.packages() });
      void qc.invalidateQueries({ queryKey: queryKeys.games() });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
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
      void qc.invalidateQueries({ queryKey: queryKeys.packages() });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
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
      void qc.invalidateQueries({ queryKey: queryKeys.packages() });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}
