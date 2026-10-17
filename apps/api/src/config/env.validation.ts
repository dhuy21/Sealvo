import { applyDecorators } from '@nestjs/common';
import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { IsDefined, IsOptional, IsString, validateSync } from 'class-validator';

// Required means "set", like ConfigService.getOrThrow: an empty value is accepted.
// Defaults stay where each variable is read.
const Required = () => applyDecorators(IsDefined({ message: '$property is required' }), IsString());
const Optional = () => applyDecorators(IsOptional(), IsString());

class RedisEnv {
  @Optional() REDIS_URL?: string;
  @Optional() REDIS_HOST?: string;
  @Optional() REDIS_PORT?: string;
  @Optional() REDIS_PASSWORD?: string;
  @Optional() REDIS_USER?: string;
}

class SchedulerEnv extends RedisEnv {
  @Required() SCHEDULER_API_URL!: string;
  @Required() CRON_SECRET!: string;
}

class WorkerEnv extends RedisEnv {
  @Optional() NODE_ENV?: string;

  // Read by Prisma itself, which fails on connect without it
  @Required() DATABASE_URL!: string;

  @Optional() RABBITMQ_URL?: string;
  @Optional() RABBITMQ_HOST?: string;
  @Optional() RABBITMQ_PORT?: string;
  @Optional() RABBITMQ_USER?: string;
  @Optional() RABBITMQ_PASS?: string;

  @Required() AWS_REGION!: string;
  @Required() AWS_ACCESS_KEY_ID!: string;
  @Required() AWS_SECRET_ACCESS_KEY!: string;
  @Required() AWS_SES_FROM!: string;
  @Optional() STAGING_EMAIL_INTERCEPT?: string;

  @Optional() GEMINI_API_KEY?: string;
  @Optional() GEMINI_MODIFY_TIMEOUT_MS?: string;
  @Optional() GEMINI_GENERATE_TIMEOUT_MS?: string;
  @Optional() GEMINI_RETRIES?: string;
  @Optional() GEMINI_RETRY_DELAY_MS?: string;
  @Optional() GEMINI_BREAKER_THRESHOLD?: string;
  @Optional() GEMINI_BREAKER_RESET_MS?: string;
}

/** The API also loads the email and import services, so it needs everything the worker does. */
class ApiEnv extends WorkerEnv {
  @Optional() PORT?: string;
  @Optional() API_PORT?: string;
  @Optional() FRONTEND_URL?: string;
  @Optional() GIT_SHA?: string;

  @Required() JWT_ACCESS_SECRET!: string;

  @Required() GOOGLE_CLIENT_ID!: string;
  @Required() GOOGLE_CLIENT_SECRET!: string;
  @Required() GOOGLE_REDIRECT_URI!: string;
  @Required() FEEDBACK_RECIPIENT_EMAIL!: string;

  @Optional() GOOGLE_TTS_PROJECT_ID?: string;
  @Optional() GOOGLE_TTS_CLIENT_EMAIL?: string;
  @Optional() GOOGLE_TTS_PRIVATE_KEY?: string;

  @Optional() CRON_SECRET?: string;
}

const validateWith =
  (schema: ClassConstructor<object>) =>
  (config: Record<string, unknown>): Record<string, unknown> => {
    const errors = validateSync(plainToInstance(schema, config), { stopAtFirstError: true });
    if (errors.length > 0) {
      const problems = errors.flatMap((error) => Object.values(error.constraints ?? {}));
      throw new Error(`Invalid environment variables:\n  - ${problems.join('\n  - ')}`);
    }
    return config;
  };

export const validateApiEnv = validateWith(ApiEnv);
export const validateWorkerEnv = validateWith(WorkerEnv);
export const validateSchedulerEnv = validateWith(SchedulerEnv);
