const textToSpeech = require('@google-cloud/text-to-speech');
const { withTimeout, withRetry, CircuitBreaker } = require('../core/resilience');

// Client créé à la première utilisation (lazy) pour ne pas crasher au load si env manquant (ex: CI, tests).
let _client = null;

const ttsBreaker = new CircuitBreaker({ name: 'google-tts', threshold: 5, resetTimeout: 30000 });

/** Default URIs used when building credentials from GOOGLE_TTS_* env vars. */
const DEFAULT_AUTH_URI = 'https://accounts.google.com/o/oauth2/auth';
const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token';
const DEFAULT_AUTH_PROVIDER_CERT_URL = 'https://www.googleapis.com/oauth2/v1/certs';

/**
 * Build credentials object from env vars (GOOGLE_TTS_*).
 * Private key: in env use literal \n (backslash + n); code replaces with real newline.
 */
function buildCredentials() {
  const projectId = process.env.GOOGLE_TTS_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_TTS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_TTS_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return null;
  const privateKeyWithNewlines = privateKey.replace(/\\n/g, '\n');
  return {
    type: process.env.GOOGLE_TTS_TYPE || 'service_account',
    project_id: projectId,
    private_key_id: process.env.GOOGLE_TTS_PRIVATE_KEY_ID || '',
    private_key: privateKeyWithNewlines,
    client_email: clientEmail,
    client_id: process.env.GOOGLE_TTS_CLIENT_ID || '',
    auth_uri: process.env.GOOGLE_TTS_AUTH_URI || DEFAULT_AUTH_URI,
    token_uri: process.env.GOOGLE_TTS_TOKEN_URI || DEFAULT_TOKEN_URI,
    auth_provider_x509_cert_url:
      process.env.GOOGLE_TTS_AUTH_PROVIDER_X509_CERT_URL || DEFAULT_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_TTS_CLIENT_X509_CERT_URL || '',
    universe_domain: process.env.GOOGLE_TTS_UNIVERSE_DOMAIN || 'googleapis.com',
  };
}

/** TTS credentials: only via GOOGLE_TTS_PROJECT_ID + GOOGLE_TTS_CLIENT_EMAIL + GOOGLE_TTS_PRIVATE_KEY. */
function getClient() {
  if (_client) return _client;
  const credentials = buildCredentials();
  if (!credentials) {
    throw new Error(
      'TTS non configuré: définir GOOGLE_TTS_PROJECT_ID, GOOGLE_TTS_CLIENT_EMAIL et GOOGLE_TTS_PRIVATE_KEY (voir app/config/README-TTS-CREDENTIALS.md).'
    );
  }
  _client = new textToSpeech.TextToSpeechClient({ credentials });
  return _client;
}

class GoogleCloudTTS {
  /**
   * Fetch all Wavenet voices available for a language from Google Cloud.
   * Returns the filtered array (Wavenet only), not a single voice.
   * Caller is responsible for caching and voice selection.
   */
  async fetchWavenetVoices(language) {
    const client = getClient();
    return ttsBreaker.execute(() =>
      withRetry(
        () =>
          withTimeout(
            () =>
              client
                .listVoices({ languageCode: language })
                .then(([r]) => r.voices.filter((v) => v.name.includes('Wavenet'))),
            8000
          ),
        { retries: 2, delay: 500 }
      )
    );
  }

  /**
   * Synthesize text to MP3 audio via Google Cloud TTS.
   * Returns a Buffer containing the raw MP3 audio content.
   */
  async synthesize(text, language, voiceName) {
    const client = getClient();
    const request = {
      input: { text },
      voice: { languageCode: language, name: voiceName, ssmlGender: 'NEUTRAL' },
      audioConfig: { audioEncoding: 'MP3' },
    };
    return ttsBreaker.execute(() =>
      withRetry(
        () =>
          withTimeout(() => client.synthesizeSpeech(request).then(([r]) => r.audioContent), 5000),
        { retries: 2, delay: 500 }
      )
    );
  }
}

module.exports = new GoogleCloudTTS();
