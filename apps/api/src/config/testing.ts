import type { AppConfig } from './app.config.js';
import type { AuthConfig } from './auth.config.js';
import type { MailConfig } from './mail.config.js';
import { EmailQueueService } from '../email/email-queue.service.js';

/** Typed config values for specs, overridable per test. */
export const testAppConfig = (overrides: Partial<AppConfig> = {}): AppConfig => ({
  nodeEnv: 'test',
  isDeployed: false,
  port: 3001,
  frontendUrl: 'http://localhost:3000',
  feedbackRecipient: 'admin@test.com',
  ...overrides,
});

export const testAuthConfig = (overrides: Partial<AuthConfig> = {}): AuthConfig => ({
  jwtSecret: 'secret',
  google: {
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'http://localhost:3001/auth/google/callback',
  },
  cronSecret: 'cron-secret',
  ...overrides,
});

export const testMailConfig = (overrides: Partial<MailConfig> = {}): MailConfig => ({
  region: 'eu-west-3',
  accessKeyId: 'x',
  secretAccessKey: 'x',
  from: 'noreply@test.com',
  interceptTo: undefined,
  ...overrides,
});

/** EmailQueueService double: `enqueue` is a mock, `enqueueOrFail` keeps its real logic on top of it. */
export const testEmailQueue = () => {
  const queue = { enqueue: vi.fn() };
  return Object.assign(queue, {
    enqueueOrFail: EmailQueueService.prototype.enqueueOrFail.bind(queue),
  });
};
