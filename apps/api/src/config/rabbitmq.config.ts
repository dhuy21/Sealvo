import { registerAs, type ConfigType } from '@nestjs/config';

/** RABBITMQ_URL wins; otherwise built from RABBITMQ_HOST. Null runs without RabbitMQ (direct fallbacks). */
export const rabbitmqConfig = registerAs('rabbitmq', () => {
  const { RABBITMQ_URL, RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USER, RABBITMQ_PASS } = process.env;
  let url: string | null = null;
  if (RABBITMQ_URL) url = RABBITMQ_URL;
  // A password with @ : / # would otherwise be read as part of the host
  else if (RABBITMQ_HOST) {
    url = `amqp://${encodeURIComponent(RABBITMQ_USER!)}:${encodeURIComponent(RABBITMQ_PASS!)}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;
  }
  return { url };
});
export type RabbitmqConfig = ConfigType<typeof rabbitmqConfig>;
