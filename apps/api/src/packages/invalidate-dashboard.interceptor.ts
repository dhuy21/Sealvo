import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { mergeMap } from 'rxjs';
import { CacheService } from '../redis/cache.service.js';
import { CACHE_KEYS } from '../redis/cache-keys.constant.js';

/**
 * Clears the cached dashboard after a successful mutation. Uses the package owner set by
 * PackageOwnershipGuard when present, else the current user. Safe (GET) requests are skipped
 * so it can be applied to a whole controller.
 */
@Injectable()
export class InvalidateDashboardInterceptor implements NestInterceptor {
  constructor(private readonly cache: CacheService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    if (request.method === 'GET') return next.handle();

    return next.handle().pipe(
      mergeMap(async (body: unknown) => {
        const userId: string | undefined = request.packageOwnerId ?? request.user?.id;
        if (userId) await this.cache.del(CACHE_KEYS.dashboard(userId));
        return body;
      }),
    );
  }
}
