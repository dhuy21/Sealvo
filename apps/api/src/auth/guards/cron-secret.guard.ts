import { timingSafeEqual } from 'crypto';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Protects internal endpoints called by the scheduler via the `X-Cron-Secret` header. */
@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('CRON_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException('CRON_SECRET is not configured');
    }

    const provided = String(context.switchToHttp().getRequest().headers['x-cron-secret'] ?? '');
    const expected = Buffer.from(secret);
    const actual = Buffer.from(provided);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}
