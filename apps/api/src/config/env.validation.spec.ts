import { validateApiEnv, validateSchedulerEnv, validateWorkerEnv } from './env.validation.js';

const WORKER_ENV = {
  DATABASE_URL: 'mysql://root:root@localhost:3306/db',
  AWS_REGION: 'eu-north-1',
  AWS_ACCESS_KEY_ID: 'key',
  AWS_SECRET_ACCESS_KEY: 'secret',
  AWS_SES_FROM: 'noreply@sealvo.test',
};

const API_ENV = {
  ...WORKER_ENV,
  JWT_ACCESS_SECRET: 'jwt-secret',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:3001/auth/google/callback',
  FEEDBACK_RECIPIENT_EMAIL: 'feedback@sealvo.test',
};

const SCHEDULER_ENV = { SCHEDULER_API_URL: 'http://api:3000', CRON_SECRET: 'cron-secret' };

const TTS_ENV = {
  GOOGLE_TTS_PROJECT_ID: 'project',
  GOOGLE_TTS_CLIENT_EMAIL: 'tts@project.iam',
  GOOGLE_TTS_PRIVATE_KEY: 'key',
};

describe('env validation', () => {
  // Validation writes the checked values back to process.env
  let saved: NodeJS.ProcessEnv;
  beforeEach(() => {
    saved = { ...process.env };
  });
  afterEach(() => {
    process.env = saved;
  });

  it('accepts a complete environment, with optional variables left empty', () => {
    const env = { ...API_ENV, REDIS_PASSWORD: '', GEMINI_API_KEY: '', CRON_SECRET: '' };

    expect(() => validateApiEnv(env)).not.toThrow();
    expect(() => validateWorkerEnv(WORKER_ENV)).not.toThrow();
    expect(() => validateSchedulerEnv(SCHEDULER_ENV)).not.toThrow();
  });

  it('applies defaults to unset and blank variables, and exposes them on process.env', () => {
    const env = validateApiEnv({ ...API_ENV, FRONTEND_URL: '' });

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      FRONTEND_URL: 'http://localhost:3000',
      API_PORT: '3001',
      REDIS_PORT: '6379',
      RABBITMQ_USER: 'guest',
    });
    expect(process.env.FRONTEND_URL).toBe('http://localhost:3000');
  });

  describe('once deployed', () => {
    const STRONG = 'x'.repeat(32);
    const PRODUCTION_API = {
      ...API_ENV,
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://www.sealvo.it.com',
      JWT_ACCESS_SECRET: STRONG,
    };
    const STAGING_API = {
      ...PRODUCTION_API,
      NODE_ENV: 'staging',
      STAGING_EMAIL_INTERCEPT: 'qa@sealvo.test',
    };

    it('accepts a complete production and staging environment', () => {
      expect(() => validateApiEnv(PRODUCTION_API)).not.toThrow();
      expect(() => validateApiEnv(STAGING_API)).not.toThrow();
    });

    it.each(['production', 'staging'])(
      'requires FRONTEND_URL in %s (no localhost default)',
      (NODE_ENV) => {
        const env = { ...STAGING_API, NODE_ENV };
        expect(() => validateApiEnv({ ...env, FRONTEND_URL: undefined })).toThrow(
          `FRONTEND_URL is required in ${NODE_ENV}`,
        );
        expect(() => validateApiEnv({ ...env, FRONTEND_URL: '' })).toThrow('FRONTEND_URL');
      },
    );

    it('requires STAGING_EMAIL_INTERCEPT in staging, for the API and the worker', () => {
      expect(() => validateApiEnv({ ...STAGING_API, STAGING_EMAIL_INTERCEPT: '' })).toThrow(
        'STAGING_EMAIL_INTERCEPT is required in staging',
      );
      expect(() => validateWorkerEnv({ ...WORKER_ENV, NODE_ENV: 'staging' })).toThrow(
        'STAGING_EMAIL_INTERCEPT is required in staging',
      );
    });

    it('rejects secrets shorter than 32 characters, only once deployed', () => {
      expect(() => validateApiEnv({ ...PRODUCTION_API, JWT_ACCESS_SECRET: 'short' })).toThrow(
        'JWT_ACCESS_SECRET must be at least 32 characters in production',
      );
      expect(() => validateApiEnv({ ...PRODUCTION_API, CRON_SECRET: 'short' })).toThrow(
        'CRON_SECRET',
      );
      expect(() => validateSchedulerEnv({ ...SCHEDULER_ENV, NODE_ENV: 'staging' })).toThrow(
        'CRON_SECRET must be at least 32 characters in staging',
      );
      expect(() => validateApiEnv({ ...API_ENV, JWT_ACCESS_SECRET: 'short' })).not.toThrow();
    });
  });

  it('removes the trailing slash of FRONTEND_URL', () => {
    expect(
      validateApiEnv({ ...API_ENV, FRONTEND_URL: 'https://www.sealvo.it.com/' }),
    ).toMatchObject({
      FRONTEND_URL: 'https://www.sealvo.it.com',
    });
  });

  it('removes the trailing slash of SCHEDULER_API_URL, which the scheduler joins with /reminders/...', () => {
    expect(
      validateSchedulerEnv({ ...SCHEDULER_ENV, SCHEDULER_API_URL: 'http://api:3000/' }),
    ).toMatchObject({ SCHEDULER_API_URL: 'http://api:3000' });
  });

  it('rejects a missing required variable', () => {
    const { JWT_ACCESS_SECRET: _, ...env } = API_ENV;

    expect(() => validateApiEnv(env)).toThrow('JWT_ACCESS_SECRET is required');
  });

  it.each(Object.keys(API_ENV))('rejects an empty %s for the API', (key) => {
    expect(() => validateApiEnv({ ...API_ENV, [key]: '' })).toThrow(`${key} is required`);
  });

  it.each(Object.keys(WORKER_ENV))('rejects an empty %s for the worker', (key) => {
    expect(() => validateWorkerEnv({ ...WORKER_ENV, [key]: '' })).toThrow(`${key} is required`);
  });

  it.each(Object.keys(SCHEDULER_ENV))('rejects an empty %s for the scheduler', (key) => {
    expect(() => validateSchedulerEnv({ ...SCHEDULER_ENV, [key]: '' })).toThrow(
      `${key} is required`,
    );
  });

  it.each([
    ['NODE_ENV', 'prodution'],
    ['FRONTEND_URL', 'localhost:3000'],
    ['GOOGLE_REDIRECT_URI', 'not a url'],
    ['PORT', 'abc'],
    ['REDIS_PORT', '99999'],
    ['AWS_SES_FROM', 'sealvo'],
    ['FEEDBACK_RECIPIENT_EMAIL', 'nobody'],
  ])('rejects a malformed %s', (key, value) => {
    expect(() => validateApiEnv({ ...API_ENV, [key]: value })).toThrow(key);
  });

  it('requires the Google TTS variables together', () => {
    expect(() => validateApiEnv({ ...API_ENV, ...TTS_ENV })).not.toThrow();
    expect(() => validateApiEnv({ ...API_ENV, ...TTS_ENV, GOOGLE_TTS_PRIVATE_KEY: '' })).toThrow(
      'missing GOOGLE_TTS_PRIVATE_KEY',
    );
  });

  it('lists every problem at once', () => {
    expect(() => validateSchedulerEnv({ CRON_SECRET: '', SCHEDULER_API_URL: 'api' })).toThrow(
      /SCHEDULER_API_URL must be a URL[\s\S]*CRON_SECRET is required/,
    );
  });
});
