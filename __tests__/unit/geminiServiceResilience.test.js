/**
 * Tests: GeminiService — resilience integration (retry, timeout, fallback).
 * Mocks @google/generative-ai at the library level to test the REAL
 * resilience wrapping + graceful degradation (return []).
 */
jest.setTimeout(25000);

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

process.env.GEMINI_API_KEY = 'fake-api-key';

let geminiService;

beforeAll(() => {
  jest.isolateModules(() => {
    geminiService = require('../../app/services/gemini');
  });
});

beforeEach(() => {
  jest.clearAllMocks();
});

const WORDS = [{ id: 1, word: 'bonjour', meaning: 'hello', type: 'noun', language_code: 'fr' }];

function mockSuccessResponse(data) {
  return {
    response: {
      text: () => JSON.stringify(data),
    },
  };
}

// ---------------------------------------------------------------------------
// Retry + fallback
// ---------------------------------------------------------------------------
describe('GeminiService — retry + graceful degradation', () => {
  it('modifyExample retries on transient failure and succeeds', async () => {
    const expected = [{ id: 1, example: '**Bonjour** tout le monde.' }];
    mockGenerateContent
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce(mockSuccessResponse(expected));

    const result = await geminiService.modifyExample(WORDS);
    expect(result).toEqual(expected);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('generateExemple retries on transient failure and succeeds', async () => {
    const expected = [{ id: 1, example: 'Dire **bonjour** est poli.' }];
    mockGenerateContent
      .mockRejectedValueOnce(new Error('RESOURCE_EXHAUSTED'))
      .mockResolvedValueOnce(mockSuccessResponse(expected));

    const result = await geminiService.generateExemple(WORDS);
    expect(result).toEqual(expected);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('returns [] when all retries fail (modifyExample)', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API DOWN'));

    const result = await geminiService.modifyExample(WORDS);
    expect(result).toEqual([]);
  });

  it('returns [] when all retries fail (generateExemple)', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API DOWN'));

    const result = await geminiService.generateExemple(WORDS);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Circuit breaker fallback
// ---------------------------------------------------------------------------
describe('GeminiService — circuit breaker fallback', () => {
  it('returns [] when circuit is OPEN (no crash, graceful degradation)', async () => {
    const freshGemini = await new Promise((resolve) => {
      jest.isolateModules(() => {
        resolve(require('../../app/services/gemini'));
      });
    });

    mockGenerateContent.mockRejectedValue(new Error('UNAVAILABLE'));
    for (let i = 0; i < 5; i++) {
      await freshGemini.modifyExample(WORDS);
    }

    mockGenerateContent.mockResolvedValue(mockSuccessResponse([{ id: 1, example: 'ok' }]));
    const result = await freshGemini.modifyExample(WORDS);
    expect(result).toEqual([]);
  });
});
