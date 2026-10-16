import { Transform } from 'class-transformer';
import validator from 'validator';

/**
 * Trims and normalizes a valid email with validator.js defaults (express-validator
 * `.trim().isEmail().normalizeEmail()`). Invalid values are left untouched for @IsEmail to reject.
 */
export function NormalizeEmail(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!validator.isEmail(trimmed)) return value;
    return validator.normalizeEmail(trimmed) || trimmed;
  });
}
