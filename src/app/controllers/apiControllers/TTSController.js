const crypto = require('crypto');
const googleCloudTTS = require('../../services/google_cloud_tts');
const { AppError } = require('../../errors/AppError');
const cache = require('../../core/cache');
const CACHE_TTL = require('../../config/cache');

/**
 * Pick a Wavenet voice deterministically based on the content.
 * Same text + same language → always the same voice → audio is cacheable.
 * Different texts may land on different voices, preserving variety.
 */
function selectVoice(voices, text, language) {
  const hash = crypto
    .createHash('md5')
    .update(text + language)
    .digest();
  const index = hash.readUInt32BE(0) % voices.length;
  return voices[index];
}

/**
 * Build a short, collision-resistant cache key from the text.
 * 12 hex chars = 48 bits ≈ 280 trillion possible values.
 */
function audioKey(text, language) {
  const hash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
  return `tts:audio:${language}:${hash}`;
}

class TTSController {
  async generateAudio(req, res) {
    const { text, language } = req.body;

    const voicesKey = `tts:voices:${language}`;
    let voices = await cache.get(voicesKey);

    if (!voices) {
      voices = await googleCloudTTS.fetchWavenetVoices(language);
      if (!voices || voices.length === 0) {
        throw new AppError(`Aucune voix disponible pour la langue: ${language}`, 422);
      }
      await cache.set(voicesKey, voices, CACHE_TTL.TTS_VOICES);
    }

    const selectedVoice = selectVoice(voices, text, language);

    const aKey = audioKey(text, language);
    let audioBuffer;

    const cachedBase64 = await cache.get(aKey);
    if (cachedBase64) {
      audioBuffer = Buffer.from(cachedBase64, 'base64');
    } else {
      audioBuffer = await googleCloudTTS.synthesize(text, language, selectedVoice.name);
      await cache.set(aKey, audioBuffer.toString('base64'), CACHE_TTL.TTS_AUDIO);
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(audioBuffer);
  }
}

module.exports = new TTSController();
