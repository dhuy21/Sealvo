import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { CircuitBreaker, isTransientError, withRetry, withTimeout } from '@sealvo/shared';

export interface ExamplePayload {
  id: number;
  word: string;
  language_code?: string;
  meaning: string;
  type: string;
  example?: string;
}

interface GeneratedExample {
  id: number | string;
  example: unknown;
}

const generatePrompt = (words: ExamplePayload[]) => `
            You are an expert language tutor. 
            Create example sentences for each of the input words according to the meaning, type of the word and the language of the word. 
            Note that the grammar of these words is important and correct. 
            Wraps any inflected form of the target word in double asterisks (**like_this**)
            Note that the target word if is a compound word, you must wrap each of its parts in double asterisks.
            Return strictly in JSON format:

            [
                {
                    id: id numeric here, 
                    example: "sentence here with the **target_word** wrapped"
                },
                {   id: "id here", 
                    example: "sentence here with the **target_word** wrapped"
                }
            ]

            Words: 
            ${JSON.stringify(words, null, 2)}`;

const modifyPrompt = (words: ExamplePayload[]) => `
            You are an expert language tutor. 
            Correct the example sentences for each of the input words according to the meaning, type of the word and the language of the word. 
            Note that the grammar of these words is important and correct. You must not change the meaning of the word and the sentence.
            If the example is not correct, you must correct it.
            If the example is correct, you must return the same example.
            Note Wraps any inflected form of the target word in double asterisks (**like_this**)
            Note that the target word if is a compound word, you must wrap each of its parts in double asterisks.
            Return strictly in JSON format:

            [
                {
                    id: id numeric here, 
                    example: "sentence here with the **target_word** wrapped"
                },
                {   id: "id here", 
                    example: "sentence here with the **target_word** wrapped"
                }
            ]

            Words: 
            ${JSON.stringify(words, null, 2)}`;

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string | undefined;
  private client: GoogleGenAI | null = null;
  private readonly modifyTimeout: number;
  private readonly generateTimeout: number;
  private readonly retries: number;
  private readonly retryDelay: number;
  private readonly breaker: CircuitBreaker;

  constructor(config: ConfigService) {
    const intEnv = (key: string, fallback: number) => {
      const n = parseInt(config.get<string>(key) ?? '', 10);
      return Number.isNaN(n) ? fallback : n;
    };

    this.apiKey = config.get<string>('GEMINI_API_KEY');
    this.modifyTimeout = intEnv('GEMINI_MODIFY_TIMEOUT_MS', 15000);
    this.generateTimeout = intEnv('GEMINI_GENERATE_TIMEOUT_MS', 30000);
    this.retries = intEnv('GEMINI_RETRIES', 1);
    this.retryDelay = intEnv('GEMINI_RETRY_DELAY_MS', 2000);
    this.breaker = new CircuitBreaker({
      name: 'gemini',
      threshold: intEnv('GEMINI_BREAKER_THRESHOLD', 5),
      resetTimeout: intEnv('GEMINI_BREAKER_RESET_MS', 60000),
    });
  }

  /** Sets `example` on each word whose array index matches a returned `id`. */
  replaceExample(words: { example?: string }[], replacements: GeneratedExample[]) {
    words.forEach((word, id) => {
      const found = replacements.find((r) => Number(r.id) === id);
      if (typeof found?.example === 'string') word.example = found.example;
    });
  }

  /** Never throws: returns [] when the key is missing, Gemini fails or the output is not JSON. */
  generateExample(words: ExamplePayload[]): Promise<GeneratedExample[]> {
    return this.ask(
      'generateExample',
      'gemini-2.5-flash',
      generatePrompt(words),
      this.generateTimeout,
      words.length,
    );
  }

  /** Never throws: returns [] when the key is missing, Gemini fails or the output is not JSON. */
  modifyExample(words: ExamplePayload[]): Promise<GeneratedExample[]> {
    return this.ask(
      'modifyExample',
      'gemini-2.5-flash-lite',
      modifyPrompt(words),
      this.modifyTimeout,
      words.length,
    );
  }

  private async ask(
    op: string,
    model: string,
    prompt: string,
    timeout: number,
    count: number,
  ): Promise<GeneratedExample[]> {
    if (!this.apiKey) {
      this.logger.warn(`${op} skipped for ${count} words: GEMINI_API_KEY is not set`);
      return [];
    }

    try {
      this.client ??= new GoogleGenAI({ apiKey: this.apiKey });
      const client = this.client;
      const response = await this.breaker.execute(() =>
        withRetry(
          () =>
            withTimeout(() => client.models.generateContent({ model, contents: prompt }), timeout),
          {
            retries: this.retries,
            delay: this.retryDelay,
            shouldRetry: isTransientError,
          },
        ),
      );
      const text = response.text ?? '';

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        try {
          parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
        } catch (parseErr) {
          this.logger.warn(`${op} JSON parse failed for ${count} words: ${errorMessage(parseErr)}`);
          return [];
        }
      }
      return Array.isArray(parsed) ? (parsed as GeneratedExample[]) : [];
    } catch (err) {
      this.logger.warn(`${op} failed for ${count} words: ${errorMessage(err)}`);
      return [];
    }
  }
}
