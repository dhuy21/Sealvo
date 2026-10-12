export type PackageMode = 'private' | 'public' | 'protected';

export interface PackageDto {
  package_id: number;
  package_name: string;
  package_description: string | null;
  mode: PackageMode;
  is_active: boolean;
  created_at: string;
  username?: string;        // Only for public/protected packages
  word_count?: number;
}

export interface CreatePackageRequest {
  package_name: string;
  package_description?: string;
  mode?: PackageMode;
}

export interface UpdatePackageRequest {
  package_name?: string;
  package_description?: string;
  mode?: PackageMode;
  is_active?: boolean;
}

export interface CopyPackageRequest {
  source_package_id: number;
}
