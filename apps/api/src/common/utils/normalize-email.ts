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

/** The typed address and its normalized form, when an older row may store either. */
export function emailLookupForms(email: string): string[] {
  const trimmed = email.trim();
  const normalized = normalizeEmail(trimmed);
  return trimmed === normalized ? [normalized] : [trimmed, normalized];
}

/** Prefer the row already stored in normalized form when both forms exist. */
export function preferredStoredEmail<T extends { email: string }>(
  email: string,
  matches: T[],
): T | undefined {
  const normalized = normalizeEmail(email.trim()).toLowerCase();
  return matches.find((match) => match.email.toLowerCase() === normalized) ?? matches[0];
}
