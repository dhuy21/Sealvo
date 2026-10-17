import { appConfig } from './app.config.js';
import { mailConfig } from './mail.config.js';
import { rabbitmqConfig } from './rabbitmq.config.js';
import { redisConfig } from './redis.config.js';
import { ttsConfig } from './tts.config.js';

// Factories read process.env after env.validation.ts has applied the defaults, as at boot
describe('config factories', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const stub = (env: Record<string, string | undefined>) => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  };

  describe('app', () => {
    it('prefers PORT (set by Railway) over API_PORT', () => {
      stub({ NODE_ENV: 'production', PORT: '8080', API_PORT: '3001' });
      expect(appConfig()).toMatchObject({ port: 8080, isDeployed: true });
    });

    it('is not deployed in development', () => {
      stub({ NODE_ENV: 'development', PORT: undefined, API_PORT: '3001' });
      expect(appConfig()).toMatchObject({ port: 3001, isDeployed: false });
    });
  });

  describe('redis', () => {
    const defaults = { REDIS_URL: undefined, REDIS_PORT: '6379', REDIS_USER: 'default', REDIS_PASSWORD: undefined };

    it('uses REDIS_URL as is', () => {
      stub({ ...defaults, REDIS_URL: 'redis://cache:6379', REDIS_HOST: 'ignored' });
      expect(redisConfig().url).toBe('redis://cache:6379');
    });

    it('builds the URL from the host, with the encoded password when set', () => {
      stub({ ...defaults, REDIS_HOST: 'cache' });
      expect(redisConfig().url).toBe('redis://cache:6379');

      stub({ REDIS_PASSWORD: 'p@ss/word' });
      expect(redisConfig().url).toBe('redis://default:p%40ss%2Fword@cache:6379');
    });

    it('is null without URL nor host', () => {
      stub({ ...defaults, REDIS_HOST: undefined });
      expect(redisConfig().url).toBeNull();
    });
  });

  describe('rabbitmq', () => {
    it('builds the URL from the host, or is null without it', () => {
      stub({ RABBITMQ_URL: undefined, RABBITMQ_HOST: 'mq', RABBITMQ_PORT: '5672', RABBITMQ_USER: 'guest', RABBITMQ_PASS: 'guest' });
      expect(rabbitmqConfig().url).toBe('amqp://guest:guest@mq:5672');

      stub({ RABBITMQ_HOST: undefined });
      expect(rabbitmqConfig().url).toBeNull();
    });
  });

  describe('mail', () => {
    it('intercepts recipients on staging only', () => {
      stub({ NODE_ENV: 'staging', STAGING_EMAIL_INTERCEPT: 'qa@test.com' });
      expect(mailConfig().interceptTo).toBe('qa@test.com');

      stub({ NODE_ENV: 'production' });
      expect(mailConfig().interceptTo).toBeUndefined();
    });
  });

  describe('tts', () => {
    it('restores the line breaks of the private key, or is null when not configured', () => {
      stub({ GOOGLE_TTS_PROJECT_ID: 'p', GOOGLE_TTS_CLIENT_EMAIL: 'e@p.iam', GOOGLE_TTS_PRIVATE_KEY: 'a\\nb' });
      expect(ttsConfig().credentials?.privateKey).toBe('a\nb');

      stub({ GOOGLE_TTS_PROJECT_ID: undefined });
      expect(ttsConfig().credentials).toBeNull();
    });
  });
});
