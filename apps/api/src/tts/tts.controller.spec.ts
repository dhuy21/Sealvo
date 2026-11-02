import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GenerateAudioDto } from './dto/generate-audio.dto.js';
import { TtsController } from './tts.controller.js';
import type { TtsService } from './tts.service.js';

describe('TtsController', () => {
  it('sends the audio with a cache lifetime matching the audio cache TTL', async () => {
    const audio = Buffer.from('mp3');
    const res = { setHeader: vi.fn(), send: vi.fn() } as any;
    const controller = new TtsController({
      synthesize: vi.fn().mockResolvedValue(audio),
    } as unknown as TtsService);

    await controller.generateAudio({ text: 'hello', language: 'en-US' }, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400');
    expect(res.send).toHaveBeenCalledWith(audio);
  });
});

describe('GenerateAudioDto', () => {
  const errorsFor = async (body: object) =>
    (await validate(plainToInstance(GenerateAudioDto, body))).map((e) => e.property);

  it('accepts a valid request', async () => {
    expect(await errorsFor({ text: 'hello', language: 'zh-CN' })).toEqual([]);
  });

  it('accepts an example sentence of up to 500 characters', async () => {
    expect(await errorsFor({ text: 'a'.repeat(500), language: 'en-US' })).toEqual([]);
  });

  it('rejects overly long text and malformed language codes', async () => {
    expect(await errorsFor({ text: 'a'.repeat(501), language: 'english' })).toEqual([
      'text',
      'language',
    ]);
  });

  it('trims the text, so blank text is rejected and spaces do not change the cached audio', async () => {
    expect(await errorsFor({ text: '   ', language: 'en-US' })).toEqual(['text']);
    expect(plainToInstance(GenerateAudioDto, { text: ' hello ', language: 'en-US' }).text).toBe(
      'hello',
    );
  });

  it('rejects a well-formed but unsupported language', async () => {
    expect(await errorsFor({ text: 'hello', language: 'sv-SE' })).toEqual(['language']);
  });
});
