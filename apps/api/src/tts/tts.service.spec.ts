import { ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { TtsService } from './tts.service.js';

const { listVoices, synthesizeSpeech } = vi.hoisted(() => ({
  listVoices: vi.fn(),
  synthesizeSpeech: vi.fn(),
}));
vi.mock('@google-cloud/text-to-speech', () => ({
  TextToSpeechClient: vi.fn(function () {
    return { listVoices, synthesizeSpeech };
  }),
}));

const transient = () =>
  Object.assign(new Error('14 UNAVAILABLE: googleapis.com secret details'), {
    code: 14,
  });

describe('TtsService', () => {
  let cache: { get: any; set: any };
  let service: TtsService;

  beforeEach(() => {
    listVoices.mockReset().mockResolvedValue([{ voices: [{ name: 'en-US-Wavenet-A' }] }]);
    synthesizeSpeech.mockReset().mockResolvedValue([{ audioContent: Buffer.from('mp3') }]);
    cache = { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(true) };
    service = new TtsService(cache as any, {
      credentials: { projectId: 'p', clientEmail: 'e@p.iam', privateKey: 'k' },
    });
    service.onModuleInit();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('serves cached audio without calling Google', async () => {
    cache.get.mockResolvedValueOnce(Buffer.from('cached').toString('base64'));

    await expect(service.synthesize('hello', 'en-US')).resolves.toEqual(Buffer.from('cached'));
    expect(synthesizeSpeech).not.toHaveBeenCalled();
  });

  it('returns the synthesized audio even when it cannot be cached', async () => {
    cache.set.mockResolvedValue(false);

    await expect(service.synthesize('hello', 'en-US')).resolves.toEqual(Buffer.from('mp3'));
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringMatching(/^tts:audio:en-US:/),
      Buffer.from('mp3').toString('base64'),
      86_400,
    );
  });

  it('keeps the 422 for a language without voices', async () => {
    listVoices.mockResolvedValue([{ voices: [{ name: 'en-US-Standard-A' }] }]);

    await expect(service.synthesize('hello', 'en-US')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('retries a transient Google error', async () => {
    vi.useFakeTimers();
    synthesizeSpeech.mockRejectedValueOnce(transient());

    const pending = service.synthesize('hello', 'en-US');
    await vi.advanceTimersByTimeAsync(1000);

    await expect(pending).resolves.toEqual(Buffer.from('mp3'));
    expect(synthesizeSpeech).toHaveBeenCalledTimes(2);
  });

  it('maps upstream errors to a generic 503', async () => {
    synthesizeSpeech.mockRejectedValue(new Error('PERMISSION_DENIED: googleapis.com secret'));

    const error = await service.synthesize('hello', 'en-US').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as Error).message).not.toContain('googleapis');
    expect(synthesizeSpeech).toHaveBeenCalledTimes(1);
  });

  it('keeps serving other users after many texts Google rejects', async () => {
    const invalidArgument = Object.assign(new Error('INVALID_ARGUMENT'), { code: 3 });
    synthesizeSpeech.mockRejectedValue(invalidArgument);
    for (let i = 0; i < 6; i++) await service.synthesize(`bad ${i}`, 'en-US').catch(() => {});

    synthesizeSpeech.mockResolvedValue([{ audioContent: Buffer.from('mp3') }]);

    await expect(service.synthesize('hello', 'en-US')).resolves.toEqual(Buffer.from('mp3'));
  });

  it('gives up with a 503 when Google never answers', async () => {
    vi.useFakeTimers();
    listVoices.mockReturnValue(new Promise(() => {}));

    const pending = service.synthesize('hello', 'en-US').catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(30_000);

    expect(await pending).toBeInstanceOf(ServiceUnavailableException);
    expect(listVoices).toHaveBeenCalledTimes(3);
  });

  it('is unavailable when Google TTS is not configured', async () => {
    const unconfigured = new TtsService(cache as any, { credentials: null });
    unconfigured.onModuleInit();

    await expect(unconfigured.synthesize('hello', 'en-US')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
