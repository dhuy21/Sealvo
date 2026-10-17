import {
  HttpException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { CircuitBreaker, isTransientError, withRetry, withTimeout } from '@sealvo/shared';
import * as crypto from 'crypto';
import { CACHE_KEYS, CACHE_TTL } from '../redis/cache-keys.constants.js';
import { CacheService } from '../redis/cache.service.js';
import { ttsConfig, type TtsConfig } from '../config/tts.config.js';

/** Resilience settings from the old app's config/resilience.js tts defaults */
const VOICES_TIMEOUT_MS = 8000;
const SYNTHESIZE_TIMEOUT_MS = 5000;
const RETRIES = 2;
const RETRY_DELAY_MS = 500;

@Injectable()
export class TtsService implements OnModuleInit {
  private readonly logger = new Logger(TtsService.name);
  private ttsClient: TextToSpeechClient | null = null;
  private readonly breaker = new CircuitBreaker({
    name: 'google-tts',
    threshold: 5,
    resetTimeout: 30_000,
  });

  constructor(
    private readonly cache: CacheService,
    @Inject(ttsConfig.KEY) private readonly config: TtsConfig,
  ) {}

  onModuleInit() {
    const { credentials } = this.config;
    if (!credentials) {
      this.logger.warn('Google TTS not configured (GOOGLE_TTS_* variables are not set)');
      return;
    }

    this.ttsClient = new TextToSpeechClient({
      credentials: {
        type: 'service_account',
        project_id: credentials.projectId,
        private_key: credentials.privateKey,
        client_email: credentials.clientEmail,
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
    return CACHE_KEYS.ttsAudio(language, hash);
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

  /** Breaker → retry (transient errors only) → timeout around a Google call */
  private callGoogle<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return this.breaker.execute(() =>
      withRetry(() => withTimeout(fn, timeout), {
        retries: RETRIES,
        delay: RETRY_DELAY_MS,
        shouldRetry: isTransientError,
      }),
    );
  }

  /** MP3 audio for the text; 422 when the language has no voice, 503 on any other failure */
  async synthesize(text: string, language: string): Promise<Buffer> {
    try {
      return await this.generate(text, language);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `TTS synthesis failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Le service de synthèse vocale est momentanément indisponible.',
      );
    }
  }

  private async generate(text: string, language: string): Promise<Buffer> {
    const client = this.ttsClient;
    if (!client) {
      throw new Error('TTS service not configured');
    }

    // Check audio cache
    const aKey = this.audioKey(text, language);
    const cachedBase64 = await this.cache.get<string>(aKey);
    if (cachedBase64) {
      return Buffer.from(cachedBase64, 'base64');
    }

    // Get available voices (cached)
    const voicesKey = CACHE_KEYS.ttsVoices(language);
    let voices = await this.cache.get<{ name: string }[]>(voicesKey);

    if (!voices) {
      const [listResponse] = await this.callGoogle(
        () => client.listVoices({ languageCode: language }),
        VOICES_TIMEOUT_MS,
      );
      voices = (listResponse.voices || [])
        .filter((v) => v.name?.includes('Wavenet'))
        .map((v) => ({ name: v.name! }));

      if (voices.length === 0) {
        throw new UnprocessableEntityException(
          `Aucune voix disponible pour la langue : ${language}`,
        );
      }

      await this.cache.set(voicesKey, voices, CACHE_TTL.TTS_VOICES);
    }

    const voiceName = this.selectVoice(voices, text, language);

    const [response] = await this.callGoogle(
      () =>
        client.synthesizeSpeech({
          input: { text },
          voice: {
            languageCode: language,
            name: voiceName,
            ssmlGender: 'NEUTRAL',
          },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      SYNTHESIZE_TIMEOUT_MS,
    );

    const audioBuffer = Buffer.from(response.audioContent as Uint8Array);

    await this.cache.set(aKey, audioBuffer.toString('base64'), CACHE_TTL.TTS_AUDIO);

    return audioBuffer;
  }
}
