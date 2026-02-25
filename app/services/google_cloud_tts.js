// Imports the Google Cloud client library
const textToSpeech = require('@google-cloud/text-to-speech');

// Ne jamais faire JSON.parse(process.env.xxx) au top-level : en CI/tests l'env est absent → crash au require().
// Client créé à la première utilisation (lazy) pour ne pas crasher au load si env manquant (ex: CI, tests).
let _client = null;

function getClient() {
  if (_client) return _client;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
  if (!raw || raw === 'undefined') {
    throw new Error(
      'TTS non configuré: variable GOOGLE_SERVICE_ACCOUNT_CREDENTIALS absente ou invalide'
    );
  }
  const credentials = JSON.parse(raw);
  _client = new textToSpeech.TextToSpeechClient({ credentials });
  return _client;
}

class GoogleCloudTTS {
  async selectVoice(voicesList, languageCode) {
    try {
      const filteredVoices = voicesList.filter((voice) =>
        voice.languageCodes.includes(languageCode)
      );

      const randomIndex = Math.floor(Math.random() * filteredVoices.length);
      const selectedVoice = filteredVoices[randomIndex];
      return selectedVoice;
    } catch (error) {
      console.error('❌ Error selecting voice:', error.message);
      throw error;
    }
  }

  async getVoiceList(language) {
    try {
      const client = getClient();
      const [response] = await client.listVoices({ languageCode: language });
      const voicesList = response.voices;

      const filteredVoices = voicesList.filter((voice) => voice.name.includes('Wavenet'));
      const randomIndex = Math.floor(Math.random() * filteredVoices.length);
      const selectedVoice = filteredVoices[randomIndex];

      return selectedVoice;
    } catch (error) {
      console.error('❌ Error getting voice list:', error.message);
      throw error;
    }
  }

  async generateAudio(text, language, voiceName) {
    try {
      const client = getClient();
      const request = {
        input: { text: text },
        voice: { languageCode: language, name: voiceName, ssmlGender: 'NEUTRAL' },
        audioConfig: { audioEncoding: 'MP3' },
      };

      const [response] = await client.synthesizeSpeech(request);
      return response.audioContent;
    } catch (error) {
      console.error('❌ Error generating audio:', error.message);
      throw error;
    }
  }
}

module.exports = new GoogleCloudTTS();
