import { registerAs, type ConfigType } from '@nestjs/config';

/** REDIS_URL wins; otherwise built from REDIS_HOST (Railway's split variables). Null runs without Redis. */
export const redisConfig = registerAs('redis', () => {
  const { REDIS_URL, REDIS_HOST, REDIS_PORT, REDIS_USER, REDIS_PASSWORD } = process.env;
  let url: string | null = null;
  if (REDIS_URL) url = REDIS_URL;
  else if (REDIS_HOST && REDIS_PASSWORD)
    url = `redis://${REDIS_USER}:${encodeURIComponent(REDIS_PASSWORD)}@${REDIS_HOST}:${REDIS_PORT}`;
  else if (REDIS_HOST) url = `redis://${REDIS_HOST}:${REDIS_PORT}`;
  return { url };
});
export type RedisConfig = ConfigType<typeof redisConfig>;
