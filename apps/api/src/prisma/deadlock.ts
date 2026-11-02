import { Prisma } from '@prisma/client';
import { withRetry } from '@sealvo/shared';

const DEADLOCK_RETRIES = 2;
const DEADLOCK_RETRY_DELAY_MS = 50;

/** MySQL 1213: InnoDB rolled the transaction back to break a deadlock (P2010 from a raw query) */
export function isDeadlock(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2034' || (error.code === 'P2010' && error.meta?.code === '1213'))
  );
}

/** Reruns a whole transaction that InnoDB chose as a deadlock victim, as MySQL recommends */
export function retryOnDeadlock<T>(transaction: () => Promise<T>): Promise<T> {
  return withRetry(transaction, {
    retries: DEADLOCK_RETRIES,
    delay: DEADLOCK_RETRY_DELAY_MS,
    shouldRetry: isDeadlock,
  });
}
