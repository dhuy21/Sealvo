/** Prisma's default 5 s interactive transaction timeout is too short for large imports and copies */
export const TX_OPTIONS = { maxWait: 10_000, timeout: 60_000 };
