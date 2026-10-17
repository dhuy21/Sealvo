export type PackageMode = 'private' | 'public' | 'protected';

/** GET /packages, GET /packages/public (with the owner's `username`) */
export interface PackageDto {
  package_id: number;
  package_name: string;
  package_description: string | null;
  mode: PackageMode;
  is_active: boolean;
  user_id: string;
  username?: string;
}

/** GET /packages/:packageId */
export interface PackageDetailDto {
  package_id: number;
  package_name: string;
  package_description: string | null;
  mode: PackageMode;
  is_active: boolean;
  username: string;
  isOwner: boolean;
}
