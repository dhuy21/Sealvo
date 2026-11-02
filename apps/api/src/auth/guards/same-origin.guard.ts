import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { appConfig, type AppConfig } from '../../config/app.config.js';

/**
 * CSRF defence for the cookie-based auth endpoints: browsers always send `Origin` on a POST, so
 * one from another site (or a sibling subdomain, which `SameSite=strict` does not stop) is refused.
 * No `Origin` means a non-browser client (curl, scheduler); the API's own origin is Swagger UI.
 */
@Injectable()
export class SameOriginGuard implements CanActivate {
  constructor(@Inject(appConfig.KEY) private readonly app: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const origin = req.headers.origin;
    if (origin === undefined || origin === this.app.frontendUrl || isOwnOrigin(origin, req)) {
      return true;
    }
    throw new ForbiddenException('Origine non autorisée');
  }
}

function isOwnOrigin(origin: string, req: Request): boolean {
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}
