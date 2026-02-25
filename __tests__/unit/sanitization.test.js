/**
 * Unit tests: sanitization (sanitizeUsername, sanitizeEmail, escapeHelper, sanitizeHtml)
 */
const {
  sanitizationUtils,
  escapeHelper,
} = require('../../app/middleware/sanitization');

describe('Sanitization (unit)', () => {
  describe('sanitizeUsername', () => {
    it('returns empty string for null or non-string', () => {
      expect(sanitizationUtils.sanitizeUsername(null)).toBe('');
      expect(sanitizationUtils.sanitizeUsername(undefined)).toBe('');
      expect(sanitizationUtils.sanitizeUsername(123)).toBe('');
    });

    it('strips dangerous characters <>\'"&/\\', () => {
      expect(sanitizationUtils.sanitizeUsername("user<script>")).toMatch(/user/);
      expect(sanitizationUtils.sanitizeUsername("a'b\"c&d/e\\f")).toBe('abcdef');
    });

    it('trims and limits length to 50', () => {
      expect(sanitizationUtils.sanitizeUsername('  ok  ')).toBe('ok');
      const long = 'a'.repeat(60);
      expect(sanitizationUtils.sanitizeUsername(long).length).toBe(50);
    });
  });

  describe('sanitizeEmail', () => {
    it('returns empty string for null or non-string', () => {
      expect(sanitizationUtils.sanitizeEmail(null)).toBe('');
      expect(sanitizationUtils.sanitizeEmail('')).toBe('');
    });

    it('throws for invalid email format', () => {
      expect(() => sanitizationUtils.sanitizeEmail('notanemail')).toThrow(/invalide/i);
      expect(() => sanitizationUtils.sanitizeEmail('a@')).toThrow(/invalide/i);
    });

    it('returns lowercased trimmed email for valid input', () => {
      expect(sanitizationUtils.sanitizeEmail('  User@Example.COM  ')).toBe('user@example.com');
    });
  });

  describe('sanitizeHtml', () => {
    it('returns input unchanged when not a string', () => {
      expect(sanitizationUtils.sanitizeHtml(null)).toBeNull();
      expect(sanitizationUtils.sanitizeHtml(5)).toBe(5);
    });

    it('strips HTML tags', () => {
      expect(sanitizationUtils.sanitizeHtml('<script>alert(1)</script>')).toBe('');
      expect(sanitizationUtils.sanitizeHtml('<b>hello</b>')).toBe('hello');
    });
  });

  describe('escapeHelper', () => {
    it('escapes HTML entities', () => {
      expect(escapeHelper('<script>')).toMatch(/&lt;/);
      expect(escapeHelper('"quoted"')).toMatch(/&quot;/);
    });

    it('returns input for null/undefined or non-string', () => {
      expect(escapeHelper(null)).toBeNull();
      expect(escapeHelper(undefined)).toBeUndefined();
    });
  });
});
