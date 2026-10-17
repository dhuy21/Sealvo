export type PackageMode = 'private' | 'public' | 'protected';

export interface CreatePackageRequest {
  package_name: string;
  package_description?: string;
  mode?: PackageMode;
}
