import { registerAs, type ConfigType } from '@nestjs/config';

/** Set by the image (GIT_SHA build arg), in every process: API, worker and scheduler. */
export const buildConfig = registerAs('build', () => ({
  gitSha: process.env.GIT_SHA ?? 'unknown',
}));
export type BuildConfig = ConfigType<typeof buildConfig>;
