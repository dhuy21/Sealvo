import { Injectable } from '@nestjs/common';
import type { packages_mode } from '@prisma/client';
import { PackageOwnershipGuard } from './package-ownership.guard.js';

/** Owner (or admin) access, plus read-only access for anyone to public and protected packages. */
@Injectable()
export class PackageReadGuard extends PackageOwnershipGuard {
  protected override allowsNonOwner(mode: packages_mode): boolean {
    return mode === 'public' || mode === 'protected';
  }
}
