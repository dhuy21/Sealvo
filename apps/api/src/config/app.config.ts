import { registerAs, type ConfigType } from '@nestjs/config';
import type { NodeEnv } from './env.validation.js';

/** Reads values already checked and defaulted by env.validation.ts. */
export const appConfig = registerAs('app', () => {
  const nodeEnv = process.env.NODE_ENV as NodeEnv;
  return {
    nodeEnv,
    // Deployed behind Railway's proxy, over HTTPS
    isDeployed: nodeEnv === 'production' || nodeEnv === 'staging',
    port: Number(process.env.PORT ?? process.env.API_PORT),
    frontendUrl: process.env.FRONTEND_URL!,
    feedbackRecipient: process.env.FEEDBACK_RECIPIENT_EMAIL!,
  };
});
export type AppConfig = ConfigType<typeof appConfig>;
