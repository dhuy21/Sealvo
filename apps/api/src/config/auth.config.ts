import { registerAs, type ConfigType } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_ACCESS_SECRET!,
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  },
  /** Unset on the API disables the internal cron endpoints */
  cronSecret: process.env.CRON_SECRET,
}));
export type AuthConfig = ConfigType<typeof authConfig>;
