import { Transform } from 'class-transformer';

/** Trims string values (express-validator `.trim()`); other values are left for validation to reject. */
export function Trim(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}
