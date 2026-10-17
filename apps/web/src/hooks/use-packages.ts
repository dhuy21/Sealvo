import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PackageDetailDto, PackageDto, PackageMode } from '@sealvo/shared';
import api from '@/lib/api';
import { invalidate, queryKeys } from '@/lib/query-keys';

export type Package = PackageDto;
export type PackageDetail = PackageDetailDto;

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
      invalidate(qc, queryKeys.packages(), queryKeys.dashboard());
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
      invalidate(qc, queryKeys.packages(), queryKeys.games(), queryKeys.dashboard());
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
      invalidate(qc, queryKeys.packages(), queryKeys.games(), queryKeys.dashboard());
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
      invalidate(qc, queryKeys.packages(), queryKeys.dashboard());
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
      invalidate(qc, queryKeys.packages(), queryKeys.dashboard());
    },
  });
}
