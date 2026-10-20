export const ACCESS_TOKEN_TTL = '15m';
/** Refresh session lifetime, counted from the last refresh (also the refresh cookie's maxAge) */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Absolute lifetime from login: refreshing never keeps a session (or a stolen token) alive longer */
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
