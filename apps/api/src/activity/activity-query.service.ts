import { Injectable } from '@nestjs/common';
import type { user_activities } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { activityPercent } from './activity-percent.js';

@Injectable()
export class ActivityQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, cursor: string | undefined, limit = 20) {
    const take = Math.min(20, Math.max(1, limit));
    const before = decodeCursor(cursor);
    const rows = await this.prisma.user_activities.findMany({
      where: {
        user_id: userId,
        ...(before
          ? {
              OR: [
                { occurred_at: { lt: before.at } },
                { AND: [{ occurred_at: before.at }, { id: { lt: before.id } }] },
              ],
            }
          : {}),
      },
      orderBy: [{ occurred_at: 'desc' }, { id: 'desc' }],
      take: take + 1,
    });
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const last = page.at(-1);
    return {
      items: page.map(toItem),
      nextCursor: hasMore && last ? encodeCursor(last) : null,
    };
  }
}

function toItem(row: user_activities) {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    occurredAt: row.occurred_at.toISOString(),
    packageName: row.package_name,
    fileName: row.file_name,
    wordCount: row.word_count,
    errorCount: row.error_count,
    phase: row.phase,
    errorMessage: row.error_message,
    percent: activityPercent(row.status, row.phase, row.progress_current, row.word_count),
  };
}

function encodeCursor(row: user_activities): string {
  return Buffer.from(JSON.stringify({ at: row.occurred_at.toISOString(), id: row.id })).toString(
    'base64url',
  );
}

function decodeCursor(cursor: string | undefined): { at: Date; id: string } | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      at?: unknown;
      id?: unknown;
    };
    if (typeof parsed.at !== 'string' || typeof parsed.id !== 'string') return null;
    const at = new Date(parsed.at);
    if (Number.isNaN(at.getTime())) return null;
    return { at, id: parsed.id };
  } catch {
    return null;
  }
}
