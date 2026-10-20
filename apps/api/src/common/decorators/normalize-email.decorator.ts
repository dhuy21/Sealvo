import { Transform } from 'class-transformer';
import { normalizeEmail } from '../utils/normalize-email.js';

/** Applies normalizeEmail; invalid values are left untouched for @IsEmail to reject. */
export function NormalizeEmail(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  );
}
