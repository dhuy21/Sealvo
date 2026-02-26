/**
 * Unit tests: TTSController.generateAudio (validation + mock TTS)
 */
const TTSController = require('../../app/controllers/apiControllers/TTSController');
const googleCloudTTS = require('../../app/services/google_cloud_tts');

jest.mock('../../app/services/google_cloud_tts');

describe('TTSController (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAudio', () => {
    it('returns 400 when text is missing', async () => {
      const req = { body: { language: 'fr' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await TTSController.generateAudio(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/texte|requis/i),
        })
      );
      expect(googleCloudTTS.getVoiceList).not.toHaveBeenCalled();
    });

    it('returns 400 when language is missing', async () => {
      const req = { body: { text: 'hello' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await TTSController.generateAudio(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/langue|requise/i),
        })
      );
      expect(googleCloudTTS.getVoiceList).not.toHaveBeenCalled();
    });

    it('returns 400 when getVoiceList returns null/undefined', async () => {
      googleCloudTTS.getVoiceList.mockResolvedValue(null);
      const req = { body: { text: 'hi', language: 'en' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await TTSController.generateAudio(req, res);
      expect(googleCloudTTS.getVoiceList).toHaveBeenCalledWith('en');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/voix|disponible/i),
        })
      );
    });

    it('returns 200 and sends audio buffer when TTS succeeds', async () => {
      const fakeVoice = { name: 'en-Wavenet-A', languageCodes: ['en'] };
      const fakeBuffer = Buffer.from('fake-mp3');
      googleCloudTTS.getVoiceList.mockResolvedValue(fakeVoice);
      googleCloudTTS.generateAudio.mockResolvedValue(fakeBuffer);
      const req = { body: { text: 'hello', language: 'en' } };
      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      await TTSController.generateAudio(req, res);
      expect(googleCloudTTS.generateAudio).toHaveBeenCalledWith('hello', 'en', 'en-Wavenet-A');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
      expect(res.send).toHaveBeenCalledWith(fakeBuffer);
    });
  });
});
