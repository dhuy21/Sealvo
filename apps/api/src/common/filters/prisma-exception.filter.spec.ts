import { Logger, type ArgumentsHost } from '@nestjs/common';
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

  it('maps a validation error to 400 with a generic message', () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const error = new Prisma.PrismaClientValidationError('internal details', {
      clientVersion: 'test',
    });

    filter.catch(error, host);

    const [, body, status] = adapter.reply.mock.calls[0];
    expect(status).toBe(400);
    expect(body.message).toBe('Données invalides.');
    expect(JSON.stringify(body)).not.toContain('internal details');
  });

  it('falls through to the default 500 for other codes', () => {
    filter.catch(prismaError('P2003'), host);

    const [, body, status] = adapter.reply.mock.calls[0];
    expect(status).toBe(500);
    expect(body.message).toBe('Internal server error');
  });

  describe('CHECK constraint violations (MySQL 3819)', () => {
    const violation =
      'MysqlError { code: 3819, message: "Check constraint \'words_chk_1\' is violated." }';

    beforeEach(() => {
      vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    });

    const expect400 = () => {
      const [, body, status] = adapter.reply.mock.calls[0];
      expect(status).toBe(400);
      expect(body.message).toBe('Données invalides.');
      expect(JSON.stringify(body)).not.toContain('words_chk_1');
    };

    it('maps a model query violation to 400', () => {
      filter.catch(
        new Prisma.PrismaClientUnknownRequestError(violation, { clientVersion: 'test' }),
        host,
      );
      expect400();
    });

    it('maps a raw query violation (P2010) to 400', () => {
      filter.catch(
        new Prisma.PrismaClientKnownRequestError(violation, {
          code: 'P2010',
          clientVersion: 'test',
          meta: { code: '3819', message: violation },
        }),
        host,
      );
      expect400();
    });

    it('keeps other unknown and raw errors as 500', () => {
      filter.catch(
        new Prisma.PrismaClientUnknownRequestError('code: 1205 lock wait', {
          clientVersion: 'test',
        }),
        host,
      );
      filter.catch(
        new Prisma.PrismaClientKnownRequestError('x', {
          code: 'P2010',
          clientVersion: 'test',
          meta: { code: '1062' },
        }),
        host,
      );
      expect(adapter.reply.mock.calls.map((call: unknown[]) => call[2])).toEqual([500, 500]);
    });
  });
});
