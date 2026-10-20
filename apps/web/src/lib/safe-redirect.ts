const BASE = 'http://same-origin.invalid';

/**
 * Only allow same-origin relative paths (blocks open redirect). The value is resolved like the
 * browser does: the URL parser drops tabs and newlines, so "/\t/evil.com" would mean "//evil.com".
 */
export function safeRedirect(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value?.startsWith('/')) return fallback;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
