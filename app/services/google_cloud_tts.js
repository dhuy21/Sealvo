// Imports the Google Cloud client library
const textToSpeech = require('@google-cloud/text-to-speech');
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);


// Import other required libraries
const {writeFile} = require('node:fs/promises');

// Creates a client
const client = new textToSpeech.TextToSpeechClient({
    credentials: credentials
});


class GoogleCloudTTS {

    async selectVoice(voicesList, languageCode) {

        try {
            const filteredVoices = voicesList.filter(voice => voice.languageCodes.includes(languageCode));
            
            //randomly select a voice from the filtered voices
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
            const [response] = await client.listVoices({languageCode: language});
            const voicesList= response.voices;

            //Filter voice of Wavenet
            const filteredVoices = voicesList.filter(voice => voice.name.includes('Wavenet'));
            //randomly select a voice from the filtered voices
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
            // Construct the request
            const request = {
                input: {text: text},
                // Select the language and SSML voice gender (optional)
                voice: {languageCode: language, name: voiceName, ssmlGender: 'NEUTRAL'},
                // select the type of audio encoding
                audioConfig: {audioEncoding: 'MP3'},
            };

            // Performs the text-to-speech request
            const [response] = await client.synthesizeSpeech(request);

            // Return the raw audio buffer for streaming
            return response.audioContent;
        } catch (error) {
            console.error('❌ Error generating audio:', error.message);
            throw error;
        }
    }
}

module.exports = new GoogleCloudTTS();