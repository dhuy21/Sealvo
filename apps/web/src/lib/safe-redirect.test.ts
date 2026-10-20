import { describe, expect, it } from 'vitest';
import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
  it('keeps same-origin paths with their query string and hash', () => {
    expect(safeRedirect('/games/vocab-quiz?package=12')).toBe('/games/vocab-quiz?package=12');
    expect(safeRedirect('/learn#card')).toBe('/learn#card');
  });

  it('falls back when there is no value or it is not a path', () => {
    expect(safeRedirect(null)).toBe('/dashboard');
    expect(safeRedirect('')).toBe('/dashboard');
    expect(safeRedirect('dashboard')).toBe('/dashboard');
    expect(safeRedirect('https://evil.com')).toBe('/dashboard');
    expect(safeRedirect('javascript:alert(1)')).toBe('/dashboard');
  });

  it.each([
    '//evil.com',
    '/\\evil.com',
    '/\t/evil.com',
    '/\n/evil.com',
    '/\r/evil.com',
    '\\/evil.com',
  ])('rejects %j, which a browser resolves to another origin', (value) => {
    expect(safeRedirect(value)).toBe('/dashboard');
  });

  it('uses the given fallback', () => {
    expect(safeRedirect('//evil.com', '/')).toBe('/');
  });
});
