import { SetMetadata } from '@nestjs/common';
import type { users_role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: users_role[]) => SetMetadata(ROLES_KEY, roles);
