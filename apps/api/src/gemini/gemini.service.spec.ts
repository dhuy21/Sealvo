import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from './gemini.service.js';

const { generateContent, GoogleGenAI } = vi.hoisted(() => {
  const generateContent = vi.fn();
  return {
    generateContent,
    GoogleGenAI: vi.fn(function () {
      return { models: { generateContent } };
    }),
  };
});
vi.mock('@google/genai', () => ({ GoogleGenAI }));

describe('GeminiService', () => {
  const payload = {
    id: 0,
    word: 'cat',
    language_code: 'en-US',
    meaning: 'chat',
    type: 'noun',
  };

  async function createService(env: Record<string, string>) {
    const module = await Test.createTestingModule({
      providers: [
        GeminiService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => env[key] },
        },
      ],
    }).compile();
    return module.get(GeminiService);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('replaceExample', () => {
    it('should merge examples by index id (numeric or string) and ignore invalid entries', async () => {
      const service = await createService({});
      const words = [{ example: '' }, { example: 'I run' }, { example: 'keep me' }];

      service.replaceExample(words, [
        { id: 0, example: 'The **cat** sleeps.' },
        { id: '1', example: 'I **ran** home.' },
        { id: 2, example: null },
        { id: 7, example: 'unknown word' },
      ]);

      expect(words.map((w) => w.example)).toEqual([
        'The **cat** sleeps.',
        'I **ran** home.',
        'keep me',
      ]);
    });
  });

  describe('generateExample / modifyExample', () => {
    it('should return [] without creating a client when GEMINI_API_KEY is missing', async () => {
      const service = await createService({});

      await expect(service.generateExample([payload])).resolves.toEqual([]);
      await expect(service.modifyExample([{ ...payload, example: 'A cat.' }])).resolves.toEqual([]);
      expect(GoogleGenAI).not.toHaveBeenCalled();
    });

    it('should return [] instead of throwing when Gemini fails', async () => {
      const service = await createService({ GEMINI_API_KEY: 'test-key' });
      generateContent.mockRejectedValue(
        Object.assign(new Error('API key not valid'), { status: 400 }),
      );

      await expect(service.generateExample([payload])).resolves.toEqual([]);
      expect(generateContent).toHaveBeenCalledTimes(1);
    });

    it('should return [] when Gemini output is not JSON', async () => {
      const service = await createService({ GEMINI_API_KEY: 'test-key' });
      generateContent.mockResolvedValue({
        text: 'Sorry, I cannot help with that.',
      });

      await expect(service.modifyExample([{ ...payload, example: 'A cat.' }])).resolves.toEqual([]);
    });

    it('should parse fenced JSON, use the right model and reuse a single client', async () => {
      const service = await createService({ GEMINI_API_KEY: 'test-key' });
      generateContent.mockResolvedValue({
        text: '```json\n[{ "id": 0, "example": "The **cat** sleeps." }]\n```',
      });

      const generated = await service.generateExample([payload]);
      await service.modifyExample([{ ...payload, example: 'The cat sleeps.' }]);

      expect(generated).toEqual([{ id: 0, example: 'The **cat** sleeps.' }]);
      expect(generateContent.mock.calls.map(([req]) => req.model)).toEqual([
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
      ]);
      expect(GoogleGenAI).toHaveBeenCalledTimes(1);
    });
  });
});
