import { Test } from '@nestjs/testing';
import { ValidationPipe, type ExecutionContext, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { WordsController } from './words.controller.js';
import { WordsService } from './words.service.js';
import { BulkWordsService } from '../import/bulk-words.service.js';
import { CacheService } from '../redis/cache.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PackageOwnershipGuard } from '../auth/guards/package-ownership.guard.js';
import { PackageReadGuard } from '../auth/guards/package-read.guard.js';
import { MAX_IMPORT_ROWS } from '@sealvo/shared';

const word = {
  word: 'cat',
  language_code: 'en-US',
  subject: 'Daily',
  type: 'noun',
  meaning: 'chat',
};

describe('WordsController POST /packages/:packageId/words', () => {
  let app: INestApplication<App>;
  let bulkWords: { add: any };

  beforeEach(async () => {
    bulkWords = {
      add: vi.fn().mockResolvedValue({
        success: true,
        async: false,
        message: '1 mot(s) ajouté(s) avec succès.',
      }),
    };
    const module = await Test.createTestingModule({
      controllers: [WordsController],
      providers: [
        { provide: WordsService, useValue: {} },
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
      .overrideGuard(PackageReadGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    // Same global pipe as main.ts
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('saves a valid array and answers 200 with the service body', async () => {
    const res = await request(app.getHttpServer())
      .post('/packages/7/words')
      .send([word])
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      async: false,
      message: '1 mot(s) ajouté(s) avec succès.',
    });
    expect(bulkWords.add).toHaveBeenCalledWith('addWords', 7, 'u1', [word]);
  });

  it('answers 202 when the words were queued', async () => {
    bulkWords.add.mockResolvedValue({
      success: true,
      jobId: 'j1',
      async: true,
      message: 'Traitement en cours.',
    });

    await request(app.getHttpServer())
      .post('/packages/7/words')
      .send([word, word, word])
      .expect(202);
  });

  it('rejects an item with an unknown property', async () => {
    await request(app.getHttpServer())
      .post('/packages/7/words')
      .send([{ ...word, is_admin: true }])
      .expect(400);
    expect(bulkWords.add).not.toHaveBeenCalled();
  });

  it(`rejects more than ${MAX_IMPORT_ROWS} words`, async () => {
    const res = await request(app.getHttpServer())
      .post('/packages/7/words')
      .send(Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => word))
      .expect(400);

    expect(res.body.message).toBe(
      `Vous ne pouvez pas ajouter plus de ${MAX_IMPORT_ROWS} mots à la fois.`,
    );
    expect(bulkWords.add).not.toHaveBeenCalled();
  });
});
