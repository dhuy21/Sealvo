import type { Prisma } from '@prisma/client';

/** Delete those of `detailIds` that no package references any more (fix #47) */
export function deleteOrphanDetails(tx: Prisma.TransactionClient, detailIds: number[]) {
  return tx.word_details.deleteMany({
    where: { detail_id: { in: detailIds }, learning: { none: {} } },
  });
}
