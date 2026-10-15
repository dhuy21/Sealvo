import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import * as crypto from 'crypto';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class TtsService implements OnModuleInit {
  private readonly logger = new Logger(TtsService.name);
  private ttsClient: TextToSpeechClient | null = null;

  constructor(private readonly redis: RedisService) {}

  onModuleInit() {
    const projectId = process.env.GOOGLE_TTS_PROJECT_ID;
    const clientEmail = process.env.GOOGLE_TTS_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_TTS_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Google TTS not configured (missing GOOGLE_TTS_PROJECT_ID, GOOGLE_TTS_CLIENT_EMAIL, or GOOGLE_TTS_PRIVATE_KEY)',
      );
      return;
    }

    this.ttsClient = new TextToSpeechClient({
      credentials: {
        type: 'service_account',
        project_id: projectId,
        private_key: privateKey.replace(/\\n/g, '\n'),
        client_email: clientEmail,
      } as Record<string, string>,
    });

    this.logger.log('Google Cloud TTS client initialized');
  }

  private audioKey(text: string, language: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(text)
      .digest('hex')
      .slice(0, 12);
    return `tts:audio:${language}:${hash}`;
  }

  private selectVoice(
    voices: { name: string }[],
    text: string,
    language: string,
  ): string {
    const hash = crypto
      .createHash('md5')
      .update(text + language)
      .digest();
    const index = hash.readUInt32BE(0) % voices.length;
    return voices[index].name;
  }

  private async cacheGet(key: string): Promise<string | null> {
    const client = this.redis.getClient();
    if (!client) return null;
    return client.get(key);
  }

  private async cacheSet(
    key: string,
    value: string,
    ttl: number,
  ): Promise<void> {
    const client = this.redis.getClient();
    if (!client) return;
    await client.set(key, value, { EX: ttl });
  }

  async synthesize(text: string, language: string): Promise<Buffer> {
    if (!this.ttsClient) {
      throw new Error('TTS service not configured');
    }

    // Check audio cache
    const aKey = this.audioKey(text, language);
    const cachedBase64 = await this.cacheGet(aKey);
    if (cachedBase64) {
      return Buffer.from(cachedBase64, 'base64');
    }

    // Get available voices (cached)
    const voicesKey = `tts:voices:${language}`;
    const cachedVoices = await this.cacheGet(voicesKey);
    let voices: { name: string }[];

    if (cachedVoices) {
      voices = JSON.parse(cachedVoices);
    } else {
      const [listResponse] = await this.ttsClient.listVoices({
        languageCode: language,
      });
      voices = (listResponse.voices || [])
        .filter((v) => v.name?.includes('Wavenet'))
        .map((v) => ({ name: v.name! }));

      if (voices.length === 0) {
        throw new Error(
          `No Wavenet voices available for language: ${language}`,
        );
      }

      await this.cacheSet(voicesKey, JSON.stringify(voices), 86400);
    }

    const voiceName = this.selectVoice(voices, text, language);

    const [response] = await this.ttsClient.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: language,
        name: voiceName,
        ssmlGender: 'NEUTRAL',
      },
      audioConfig: { audioEncoding: 'MP3' },
    });

    const audioBuffer = Buffer.from(response.audioContent as Uint8Array);

    await this.cacheSet(aKey, audioBuffer.toString('base64'), 86400);

    return audioBuffer;
  }
}
