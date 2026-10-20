import { registerAs, type ConfigType } from '@nestjs/config';

/** Unset apiKey disables enrichment: words are saved without generated details */
export const geminiConfig = registerAs('gemini', () => ({
  apiKey: process.env.GEMINI_API_KEY,
}));
export type GeminiConfig = ConfigType<typeof geminiConfig>;
