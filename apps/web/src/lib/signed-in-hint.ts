/** Not a session. Lets the header paint Home or Dashboard on the first HTML, before /auth/refresh returns. */
export const SIGNED_IN_HINT = 'sealvo_signed_in';

export function setSignedInHint(signedIn: boolean): void {
  if (typeof document === 'undefined') return;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = signedIn
    ? `${SIGNED_IN_HINT}=1; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
    : `${SIGNED_IN_HINT}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
