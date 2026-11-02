import { registerAs, type ConfigType } from '@nestjs/config';

export const schedulerConfig = registerAs('scheduler', () => ({
  apiUrl: process.env.SCHEDULER_API_URL!,
  cronSecret: process.env.CRON_SECRET!,
}));
export type SchedulerConfig = ConfigType<typeof schedulerConfig>;
