import { ValidateIf } from 'class-validator';

/**
 * Like @IsOptional() but only skips validation when the property is absent (undefined):
 * an explicit `null` is still validated, so it is rejected instead of reaching Prisma.
 */
export function IsOptionalDefined(): PropertyDecorator {
  return ValidateIf((_object: object, value: unknown) => value !== undefined);
}
