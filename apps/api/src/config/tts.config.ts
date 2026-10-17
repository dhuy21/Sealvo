import { registerAs, type ConfigType } from '@nestjs/config';

/** Null disables TTS. env.validation.ts guarantees the three variables come together. */
export const ttsConfig = registerAs('tts', () => {
  const { GOOGLE_TTS_PROJECT_ID, GOOGLE_TTS_CLIENT_EMAIL, GOOGLE_TTS_PRIVATE_KEY } = process.env;
  if (!GOOGLE_TTS_PROJECT_ID || !GOOGLE_TTS_CLIENT_EMAIL || !GOOGLE_TTS_PRIVATE_KEY) return { credentials: null };
  return {
    credentials: {
      projectId: GOOGLE_TTS_PROJECT_ID,
      clientEmail: GOOGLE_TTS_CLIENT_EMAIL,
      // Railway and .env files store the key on one line with literal \n
      privateKey: GOOGLE_TTS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
  };
});
export type TtsConfig = ConfigType<typeof ttsConfig>;
