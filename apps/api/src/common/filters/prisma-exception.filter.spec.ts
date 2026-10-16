import type { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter.js';

describe('PrismaExceptionFilter', () => {
  const response = {};
  const host = { getArgByIndex: () => response } as unknown as ArgumentsHost;
  let adapter: { reply: any; isHeadersSent: any; end: any };
  let filter: PrismaExceptionFilter;

  const prismaError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('internal details', {
      code,
      clientVersion: 'test',
    });

  beforeEach(() => {
    adapter = { reply: vi.fn(), isHeadersSent: vi.fn().mockReturnValue(false), end: vi.fn() };
    filter = new PrismaExceptionFilter(adapter as any);
  });

  it.each([
    ['P2002', 409],
    ['P2025', 404],
    ['P2000', 400],
  ])('maps %s to %i without leaking details', (code, status) => {
    filter.catch(prismaError(code), host);

    const [, body, replyStatus] = adapter.reply.mock.calls[0];
    expect(replyStatus).toBe(status);
    expect(JSON.stringify(body)).not.toContain('internal details');
  });

  it('falls through to the default 500 for other codes', () => {
    filter.catch(prismaError('P2003'), host);

    const [, body, status] = adapter.reply.mock.calls[0];
    expect(status).toBe(500);
    expect(body.message).toBe('Internal server error');
  });
});
