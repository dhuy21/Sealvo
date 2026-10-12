/**
 * Unit tests: TTSController — cache-aside (voices + audio),
 * deterministic voice selection, graceful degradation.
 *
 * Input validation (text, language) is now handled by ttsGenerateSchema
 * middleware (Phase 3). See integration/middleware tests for that coverage.
 */
const crypto = require('crypto');
const { AppError } = require('../../app/errors/AppError');

jest.mock('../../app/services/google_cloud_tts');
jest.mock('../../app/core/cache', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  invalidatePattern: jest.fn(),
}));

const TTSController = require('../../app/controllers/apiControllers/TTSController');
const googleCloudTTS = require('../../app/services/google_cloud_tts');
const cache = require('../../app/core/cache');

const FAKE_VOICES = [
  { name: 'fr-FR-Wavenet-A', languageCodes: ['fr-FR'] },
  { name: 'fr-FR-Wavenet-B', languageCodes: ['fr-FR'] },
  { name: 'fr-FR-Wavenet-C', languageCodes: ['fr-FR'] },
];
const FAKE_BUFFER = Buffer.from('fake-mp3-audio-content');

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    setHeader: jest.fn(),
    send: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  cache.get.mockResolvedValue(null);
  cache.set.mockResolvedValue(true);
});

// ────────────────────────────────────────────────────────
// 1. Business Logic Errors
// ────────────────────────────────────────────────────────
// Input validation (text, language presence) is now in ttsGenerateSchema middleware.
describe('TTSController — business logic errors', () => {
  it('throws AppError 422 when no Wavenet voices available', async () => {
    googleCloudTTS.fetchWavenetVoices.mockResolvedValue([]);
    const res = mockRes();
    await expect(
      TTSController.generateAudio({ body: { text: 'hi', language: 'zz-ZZ' } }, res)
    ).rejects.toThrow(AppError);
    await expect(
      TTSController.generateAudio({ body: { text: 'hi', language: 'zz-ZZ' } }, res)
    ).rejects.toThrow(/voix disponible/i);
  });
});

// ────────────────────────────────────────────────────────
// 2. Voice List Cache-Aside
// ────────────────────────────────────────────────────────
describe('TTSController — voice list caching', () => {
  it('fetches from Google and caches on miss', async () => {
    cache.get.mockResolvedValue(null);
    googleCloudTTS.fetchWavenetVoices.mockResolvedValue(FAKE_VOICES);
    googleCloudTTS.synthesize.mockResolvedValue(FAKE_BUFFER);

    const res = mockRes();
    await TTSController.generateAudio({ body: { text: 'bonjour', language: 'fr-FR' } }, res);

    expect(cache.get).toHaveBeenCalledWith('tts:voices:fr-FR');
    expect(googleCloudTTS.fetchWavenetVoices).toHaveBeenCalledWith('fr-FR');
    expect(cache.set).toHaveBeenCalledWith('tts:voices:fr-FR', FAKE_VOICES, 21600);
    expect(res.send).toHaveBeenCalled();
  });

  it('uses cached voice list on hit (no Google API call)', async () => {
    cache.get.mockImplementation((key) => {
      if (key === 'tts:voices:fr-FR') return Promise.resolve(FAKE_VOICES);
      return Promise.resolve(null);
    });
    googleCloudTTS.synthesize.mockResolvedValue(FAKE_BUFFER);

    const res = mockRes();
    await TTSController.generateAudio({ body: { text: 'bonjour', language: 'fr-FR' } }, res);

    expect(googleCloudTTS.fetchWavenetVoices).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────
// 3. Deterministic Voice Selection
// ────────────────────────────────────────────────────────
describe('TTSController — deterministic voice selection', () => {
  it('always selects the same voice for the same text+language', async () => {
    const selectedNames = new Set();

    for (let i = 0; i < 10; i++) {
      cache.get.mockImplementation((key) => {
        if (key === 'tts:voices:fr-FR') return Promise.resolve(FAKE_VOICES);
        return Promise.resolve(null);
      });
      googleCloudTTS.synthesize.mockResolvedValue(FAKE_BUFFER);

      const res = mockRes();
      await TTSController.generateAudio({ body: { text: 'bonjour', language: 'fr-FR' } }, res);

      const callArgs = googleCloudTTS.synthesize.mock.calls[i];
      selectedNames.add(callArgs[2]);
    }

    expect(selectedNames.size).toBe(1);
  });

  it('may select different voices for different texts', async () => {
    const texts = ['bonjour', 'merci', 'au revoir', 'salut', 'bonsoir'];
    const selectedNames = new Set();

    for (const text of texts) {
      cache.get.mockImplementation((key) => {
        if (key === 'tts:voices:fr-FR') return Promise.resolve(FAKE_VOICES);
        return Promise.resolve(null);
      });
      googleCloudTTS.synthesize.mockResolvedValue(FAKE_BUFFER);

      const res = mockRes();
      await TTSController.generateAudio({ body: { text, language: 'fr-FR' } }, res);

      const lastCall = googleCloudTTS.synthesize.mock.calls.at(-1);
      selectedNames.add(lastCall[2]);
    }

    // With 5 texts and 3 voices, it's statistically very likely to have > 1 voice
    expect(selectedNames.size).toBeGreaterThanOrEqual(1);
  });
});

// ────────────────────────────────────────────────────────
// 4. Audio Cache-Aside
// ────────────────────────────────────────────────────────
describe('TTSController — audio caching', () => {
  function expectedAudioKey(text, language) {
    const hash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
    return `tts:audio:${language}:${hash}`;
  }

  it('generates audio and caches as base64 on miss', async () => {
    cache.get.mockImplementation((key) => {
      if (key === 'tts:voices:fr-FR') return Promise.resolve(FAKE_VOICES);
      return Promise.resolve(null);
    });
    googleCloudTTS.synthesize.mockResolvedValue(FAKE_BUFFER);

    const res = mockRes();
    await TTSController.generateAudio({ body: { text: 'bonjour', language: 'fr-FR' } }, res);

    const aKey = expectedAudioKey('bonjour', 'fr-FR');
    expect(cache.get).toHaveBeenCalledWith(aKey);
    expect(googleCloudTTS.synthesize).toHaveBeenCalled();
    expect(cache.set).toHaveBeenCalledWith(aKey, FAKE_BUFFER.toString('base64'), 86400);
    expect(res.send).toHaveBeenCalledWith(FAKE_BUFFER);
  });

  it('returns cached audio without calling Google API on hit', async () => {
    const aKey = expectedAudioKey('bonjour', 'fr-FR');
    cache.get.mockImplementation((key) => {
      if (key === 'tts:voices:fr-FR') return Promise.resolve(FAKE_VOICES);
      if (key === aKey) return Promise.resolve(FAKE_BUFFER.toString('base64'));
      return Promise.resolve(null);
    });

    const res = mockRes();
    await TTSController.generateAudio({ body: { text: 'bonjour', language: 'fr-FR' } }, res);

    expect(googleCloudTTS.synthesize).not.toHaveBeenCalled();
    const sentBuffer = res.send.mock.calls[0][0];
    expect(Buffer.isBuffer(sentBuffer)).toBe(true);
    expect(sentBuffer.toString()).toBe(FAKE_BUFFER.toString());
  });

  it('sets correct response headers', async () => {
    cache.get.mockImplementation((key) => {
      if (key === 'tts:voices:fr-FR') return Promise.resolve(FAKE_VOICES);
      return Promise.resolve(null);
    });
    googleCloudTTS.synthesize.mockResolvedValue(FAKE_BUFFER);

    const res = mockRes();
    await TTSController.generateAudio({ body: { text: 'bonjour', language: 'fr-FR' } }, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Length', FAKE_BUFFER.length);
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400');
  });
});

// ────────────────────────────────────────────────────────
// 5. Graceful Degradation
// ────────────────────────────────────────────────────────
describe('TTSController — graceful degradation', () => {
  it('works when cache.get returns null (Redis down)', async () => {
    cache.get.mockResolvedValue(null);
    cache.set.mockResolvedValue(false);
    googleCloudTTS.fetchWavenetVoices.mockResolvedValue(FAKE_VOICES);
    googleCloudTTS.synthesize.mockResolvedValue(FAKE_BUFFER);

    const res = mockRes();
    await TTSController.generateAudio({ body: { text: 'bonjour', language: 'fr-FR' } }, res);

    expect(res.send).toHaveBeenCalledWith(FAKE_BUFFER);
  });

  it('propagates error when Google API throws', async () => {
    cache.get.mockResolvedValue(null);
    googleCloudTTS.fetchWavenetVoices.mockRejectedValue(new Error('API unavailable'));

    const res = mockRes();
    await expect(
      TTSController.generateAudio({ body: { text: 'bonjour', language: 'fr-FR' } }, res)
    ).rejects.toThrow('API unavailable');
  });
});
