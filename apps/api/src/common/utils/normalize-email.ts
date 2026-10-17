import validator from 'validator';

/**
 * Trims and normalizes a valid email with validator.js defaults (express-validator
 * `.trim().isEmail().normalizeEmail()`). Invalid values are returned untouched.
 */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim();
  if (!validator.isEmail(trimmed)) return email;
  return validator.normalizeEmail(trimmed) || trimmed;
}
