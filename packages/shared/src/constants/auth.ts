/** Length limits of account credentials */
export const AUTH_LIMITS = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 50,
  PASSWORD_MIN: 6,
  RESET_PASSWORD_MIN: 8,
  /** bcrypt ignores everything after the first 72 bytes */
  PASSWORD_MAX_BYTES: 72,
} as const;

/** Avatars are numbered 1..AVATAR_COUNT */
export const AVATAR_COUNT = 11;
