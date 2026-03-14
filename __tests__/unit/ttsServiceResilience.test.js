/**
 * Tests: GoogleCloudTTS service — resilience integration (retry, timeout, circuit breaker).
 * Mocks @google-cloud/text-to-speech at the library level to test the REAL
 * resilience wrapping in google_cloud_tts.js.
 */
jest.setTimeout(15000);

const { CircuitOpenError } = require('../../app/core/resilience');

const mockListVoices = jest.fn();
const mockSynthesizeSpeech = jest.fn();

jest.mock('@google-cloud/text-to-speech', () => ({
  TextToSpeechClient: jest.fn().mockImplementation(() => ({
    listVoices: mockListVoices,
    synthesizeSpeech: mockSynthesizeSpeech,
  })),
}));

process.env.GOOGLE_TTS_PROJECT_ID = 'test-project';
process.env.GOOGLE_TTS_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
process.env.GOOGLE_TTS_PRIVATE_KEY =
  '-----BEGIN RSA PRIVATE KEY-----\\nfake\\n-----END RSA PRIVATE KEY-----';

const VOICES = [{ name: 'fr-FR-Wavenet-A', languageCodes: ['fr-FR'] }];

let googleCloudTTS;

beforeAll(() => {
  jest.isolateModules(() => {
    googleCloudTTS = require('../../app/services/google_cloud_tts');
  });
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Retry behavior — proves the service retries on transient failure
// ---------------------------------------------------------------------------
describe('GoogleCloudTTS — retry', () => {
  it('synthesize retries on transient gRPC error and succeeds', async () => {
    mockSynthesizeSpeech
      .mockRejectedValueOnce(new Error('14 UNAVAILABLE'))
      .mockResolvedValueOnce([{ audioContent: Buffer.from('mp3-data') }]);

    const result = await googleCloudTTS.synthesize('bonjour', 'fr-FR', 'fr-FR-Wavenet-A');
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe('mp3-data');
    expect(mockSynthesizeSpeech).toHaveBeenCalledTimes(2);
  });

  it('fetchWavenetVoices retries on transient gRPC error and succeeds', async () => {
    mockListVoices
      .mockRejectedValueOnce(new Error('DEADLINE_EXCEEDED'))
      .mockResolvedValueOnce([{ voices: VOICES }]);

    const result = await googleCloudTTS.fetchWavenetVoices('fr-FR');
    expect(result).toEqual(VOICES);
    expect(mockListVoices).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Error propagation — proves errors surface after retry exhaustion
// ---------------------------------------------------------------------------
describe('GoogleCloudTTS — error propagation after retries', () => {
  it('throws after all 3 attempts fail (1 initial + 2 retries)', async () => {
    mockSynthesizeSpeech
      .mockRejectedValueOnce(new Error('UNAVAILABLE'))
      .mockRejectedValueOnce(new Error('UNAVAILABLE'))
      .mockRejectedValueOnce(new Error('FINAL_ERROR'));

    await expect(googleCloudTTS.synthesize('test', 'fr-FR', 'fr-FR-Wavenet-A')).rejects.toThrow(
      'FINAL_ERROR'
    );
    expect(mockSynthesizeSpeech).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// Circuit breaker — proves shared breaker opens and blocks calls
// ---------------------------------------------------------------------------
describe('GoogleCloudTTS — circuit breaker', () => {
  it('opens after threshold failures and rejects with CircuitOpenError', async () => {
    const freshTTS = await new Promise((resolve) => {
      jest.isolateModules(() => {
        resolve(require('../../app/services/google_cloud_tts'));
      });
    });

    mockSynthesizeSpeech.mockRejectedValue(new Error('UNAVAILABLE'));
    for (let i = 0; i < 5; i++) {
      await freshTTS.synthesize('test', 'fr-FR', 'fr-FR-Wavenet-A').catch(() => {});
    }

    mockSynthesizeSpeech.mockResolvedValue([{ audioContent: Buffer.from('ok') }]);
    await expect(freshTTS.synthesize('test', 'fr-FR', 'fr-FR-Wavenet-A')).rejects.toThrow(
      /Circuit breaker.*OPEN/
    );
  });
});
