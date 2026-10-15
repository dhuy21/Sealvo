/** Only allow same-origin relative paths (blocks open redirect). */
export function safeRedirect(value: string | null | undefined, fallback = '/dashboard'): string {
  if (value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')) {
    return value;
  }
  return fallback;
}
