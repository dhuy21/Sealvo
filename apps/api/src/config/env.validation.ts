import { applyDecorators } from '@nestjs/common';
import { plainToInstance, Transform, type ClassConstructor } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsPort,
  IsString,
  IsUrl,
  validateSync,
} from 'class-validator';

export const NODE_ENVS = ['development', 'test', 'staging', 'production'] as const;
export type NodeEnv = (typeof NODE_ENVS)[number];

// Required means "set to a non-empty value": a blank `KEY=` line in .env counts as missing
const Required = () =>
  applyDecorators(
    IsDefined({ message: '$property is required' }),
    IsString(),
    IsNotEmpty({ message: '$property must not be empty' }),
  );
const Optional = () => applyDecorators(IsOptional(), IsString());
const Url = () =>
  IsUrl(
    { require_tld: false, require_protocol: true },
    { message: '$property must be a URL with its protocol' },
  );
/** For a base URL joined with paths (`${url}/login`) */
const WithoutTrailingSlash = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.replace(/\/+$/, '') : value));

class RedisEnv {
  @Optional() REDIS_URL?: string;
  @Optional() REDIS_HOST?: string;
  @IsPort() REDIS_PORT = '6379';
  @Optional() REDIS_PASSWORD?: string;
  @Optional() REDIS_USER = 'default';
}

class SchedulerEnv extends RedisEnv {
  @WithoutTrailingSlash() @Required() @Url() SCHEDULER_API_URL!: string;
  @Required() CRON_SECRET!: string;
}

class WorkerEnv extends RedisEnv {
  @IsIn(NODE_ENVS) NODE_ENV: NodeEnv = 'development';

  // Read by Prisma itself, which fails on connect without it
  @Required() DATABASE_URL!: string;

  @Optional() RABBITMQ_URL?: string;
  @Optional() RABBITMQ_HOST?: string;
  @IsPort() RABBITMQ_PORT = '5672';
  @Optional() RABBITMQ_USER = 'guest';
  // nosemgrep: ajinabraham.njsscan.generic.hardcoded_secrets.node_password (RabbitMQ's local default; production sets its own)
  @Optional() RABBITMQ_PASS = 'guest';

  @Required() AWS_REGION!: string;
  @Required() AWS_ACCESS_KEY_ID!: string;
  @Required() AWS_SECRET_ACCESS_KEY!: string;
  @Required() @IsEmail() AWS_SES_FROM!: string;
  @IsOptional() @IsEmail() STAGING_EMAIL_INTERCEPT?: string;

  @Optional() GEMINI_API_KEY?: string;
}

/** The API also loads the email and import services, so it needs everything the worker does. */
class ApiEnv extends WorkerEnv {
  @IsOptional() @IsPort() PORT?: string;
  @IsPort() API_PORT = '3001';
  // Also compared with the Origin header (CORS), which never ends with a slash
  @WithoutTrailingSlash()
  @Url()
  FRONTEND_URL = 'http://localhost:3000';
  @Optional() GIT_SHA?: string;

  @Required() JWT_ACCESS_SECRET!: string;

  @Required() GOOGLE_CLIENT_ID!: string;
  @Required() GOOGLE_CLIENT_SECRET!: string;
  @Required() @Url() GOOGLE_REDIRECT_URI!: string;
  @Required() @IsEmail() FEEDBACK_RECIPIENT_EMAIL!: string;

  @Optional() GOOGLE_TTS_PROJECT_ID?: string;
  @Optional() GOOGLE_TTS_CLIENT_EMAIL?: string;
  @Optional() GOOGLE_TTS_PRIVATE_KEY?: string;

  @Optional() CRON_SECRET?: string;
}

/** Variables that only make sense together: either all set or none. */
const GROUPS: Partial<Record<string, string[][]>> = {
  ApiEnv: [['GOOGLE_TTS_PROJECT_ID', 'GOOGLE_TTS_CLIENT_EMAIL', 'GOOGLE_TTS_PRIVATE_KEY']],
};

type DeployedEnv = Extract<NodeEnv, 'production' | 'staging'>;

/**
 * Optional in development, required once deployed: their default (or absence) would silently be
 * wrong there (CORS and email links; staging emails reaching real users; reminders and cleanup
 * answered 503 without CRON_SECRET).
 */
const REQUIRED_WHEN_DEPLOYED: Partial<Record<string, Partial<Record<DeployedEnv, string[]>>>> = {
  ApiEnv: {
    production: ['FRONTEND_URL', 'CRON_SECRET'],
    staging: ['FRONTEND_URL', 'STAGING_EMAIL_INTERCEPT', 'CRON_SECRET'],
  },
  WorkerEnv: { staging: ['STAGING_EMAIL_INTERCEPT'] },
};

/** Signing and shared secrets: a short one can be guessed offline (JWT) or brute-forced */
const SECRETS: Partial<Record<string, string[]>> = {
  ApiEnv: ['JWT_ACCESS_SECRET', 'CRON_SECRET'],
  SchedulerEnv: ['CRON_SECRET'],
};
const MIN_SECRET_LENGTH = 32;

const deployedProblems = (schema: ClassConstructor<object>, present: Record<string, unknown>) => {
  const nodeEnv = present.NODE_ENV;
  if (nodeEnv !== 'production' && nodeEnv !== 'staging') return [];
  const missing = (REQUIRED_WHEN_DEPLOYED[schema.name]?.[nodeEnv] ?? [])
    .filter((key) => present[key] === undefined)
    .map((key) => `${key} is required in ${nodeEnv}`);
  const weak = (SECRETS[schema.name] ?? [])
    .filter((key) => typeof present[key] === 'string' && present[key].length < MIN_SECRET_LENGTH)
    .map((key) => `${key} must be at least ${MIN_SECRET_LENGTH} characters in ${nodeEnv}`);
  return [...missing, ...weak];
};

const groupProblems = (schema: ClassConstructor<object>, env: Record<string, unknown>) =>
  (GROUPS[schema.name] ?? []).flatMap((group) => {
    const set = group.filter((key) => env[key] !== undefined);
    return set.length === 0 || set.length === group.length
      ? []
      : [
          `${group.join(', ')} must be set together (missing ${group.filter((k) => !set.includes(k)).join(', ')})`,
        ];
  });

/**
 * Validates the environment once at boot and writes the result back to process.env, so the
 * config factories in this folder read checked values with their defaults applied.
 * Blank values count as unset.
 */
const validateWith =
  (schema: ClassConstructor<object>) =>
  (config: Record<string, unknown>): Record<string, unknown> => {
    const present = Object.fromEntries(Object.entries(config).filter(([, value]) => value !== ''));
    const env = plainToInstance(schema, present) as Record<string, unknown>;
    const problems = [
      ...validateSync(env, { stopAtFirstError: true }).flatMap((error) =>
        Object.values(error.constraints ?? {}),
      ),
      ...groupProblems(schema, env),
      ...deployedProblems(schema, present),
    ];
    if (problems.length > 0) {
      throw new Error(`Invalid environment variables:\n  - ${problems.join('\n  - ')}`);
    }
    for (const [key, value] of Object.entries(config)) {
      if (value === '') delete process.env[key];
    }
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === 'string') process.env[key] = value;
    }
    return env;
  };

export const validateApiEnv = validateWith(ApiEnv);
export const validateWorkerEnv = validateWith(WorkerEnv);
export const validateSchedulerEnv = validateWith(SchedulerEnv);
