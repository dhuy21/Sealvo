import { ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GenerateAudioDto, TtsController } from './tts.controller.js';
import type { TtsService } from './tts.service.js';

describe('TtsController', () => {
  let synthesize: any;
  let controller: TtsController;
  const res = { setHeader: vi.fn(), send: vi.fn() } as any;
  const dto = { text: 'hello', language: 'en-US' };

  beforeEach(() => {
    synthesize = vi.fn();
    controller = new TtsController({ synthesize } as unknown as TtsService);
  });

  it('keeps the 422 for a language without voices', async () => {
    synthesize.mockRejectedValue(new UnprocessableEntityException('no voice'));

    await expect(controller.generateAudio(dto, res)).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps upstream errors to a generic 503', async () => {
    synthesize.mockRejectedValue(new Error('14 UNAVAILABLE: googleapis.com secret details'));

    const error = await controller.generateAudio(dto, res).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as Error).message).not.toContain('googleapis');
  });
});

describe('GenerateAudioDto', () => {
  const errorsFor = async (body: object) =>
    (await validate(plainToInstance(GenerateAudioDto, body))).map((e) => e.property);

  it('accepts a valid request', async () => {
    expect(await errorsFor({ text: 'hello', language: 'zh-CN' })).toEqual([]);
  });

  it('rejects overly long text and malformed language codes', async () => {
    expect(await errorsFor({ text: 'a'.repeat(201), language: 'english' })).toEqual([
      'text',
      'language',
    ]);
  });
});
