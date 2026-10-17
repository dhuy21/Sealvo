import { Test } from '@nestjs/testing';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { ImportController } from './import.controller.js';
import { ImportService } from './import.service.js';
import { BulkWordsService } from './bulk-words.service.js';
import { CacheService } from '../redis/cache.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PackageOwnershipGuard } from '../auth/guards/package-ownership.guard.js';

describe('ImportController POST /packages/:packageId/import', () => {
  let app: INestApplication<App>;
  let bulkWords: { add: any };

  beforeEach(async () => {
    bulkWords = { add: vi.fn().mockResolvedValue({ success: true, async: false }) };
    const module = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [
        { provide: ImportService, useValue: { parseWords: vi.fn().mockReturnValue([]) } },
        { provide: BulkWordsService, useValue: bulkWords },
        { provide: CacheService, useValue: { del: vi.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest().user = { id: 'u1' };
          return true;
        },
      })
      .overrideGuard(PackageOwnershipGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const upload = () =>
    request(app.getHttpServer())
      .post('/packages/7/import')
      .attach('file', Buffer.from('xlsx'), 'words.xlsx');

  it('accepts a single Excel file', async () => {
    const res = await upload();

    expect(res.status).toBe(200);
    expect(bulkWords.add).toHaveBeenCalledWith('import', 7, 'u1', []);
  });

  it('rejects text fields sent along with the file', async () => {
    const res = await upload().field('padding', 'x'.repeat(1000));

    expect(res.status).toBe(400);
    expect(bulkWords.add).not.toHaveBeenCalled();
  });

  it('rejects a second file', async () => {
    const res = await upload().attach('file', Buffer.from('xlsx'), 'more.xlsx');

    expect(res.status).toBe(400);
    expect(bulkWords.add).not.toHaveBeenCalled();
  });
});
