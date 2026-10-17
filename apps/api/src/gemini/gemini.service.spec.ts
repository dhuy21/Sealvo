import { Test } from '@nestjs/testing';
import { geminiConfig } from '../config/gemini.config.js';
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

  async function createService(apiKey?: string) {
    const module = await Test.createTestingModule({
      providers: [
        GeminiService,
        { provide: geminiConfig.KEY, useValue: { apiKey } },
      ],
    }).compile();
    return module.get(GeminiService);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateExample / modifyExample', () => {
    it('should return [] without creating a client when GEMINI_API_KEY is missing', async () => {
      const service = await createService();

      await expect(service.generateExample([payload])).resolves.toEqual([]);
      await expect(service.modifyExample([{ ...payload, example: 'A cat.' }])).resolves.toEqual([]);
      expect(GoogleGenAI).not.toHaveBeenCalled();
    });

    it('should return [] instead of throwing when Gemini fails', async () => {
      const service = await createService('test-key');
      generateContent.mockRejectedValue(
        Object.assign(new Error('API key not valid'), { status: 400 }),
      );

      await expect(service.generateExample([payload])).resolves.toEqual([]);
      expect(generateContent).toHaveBeenCalledTimes(1);
    });

    it('should return [] when Gemini output is not JSON', async () => {
      const service = await createService('test-key');
      generateContent.mockResolvedValue({
        text: 'Sorry, I cannot help with that.',
      });

      await expect(service.modifyExample([{ ...payload, example: 'A cat.' }])).resolves.toEqual([]);
    });

    it('should parse fenced JSON, use the right model and reuse a single client', async () => {
      const service = await createService('test-key');
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
