import { registerAs, type ConfigType } from '@nestjs/config';

export const mailConfig = registerAs('mail', () => ({
  region: process.env.AWS_REGION!,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  from: process.env.AWS_SES_FROM!,
  /** Staging only: every email goes to this inbox instead of the real recipient */
  interceptTo: process.env.NODE_ENV === 'staging' ? process.env.STAGING_EMAIL_INTERCEPT : undefined,
}));
export type MailConfig = ConfigType<typeof mailConfig>;
