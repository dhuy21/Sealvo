import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { testAppConfig } from '../../config/testing.js';
import { AuthController } from '../auth.controller.js';
import { SameOriginGuard } from './same-origin.guard.js';

const contextWith = (headers: Record<string, string>) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as unknown as ExecutionContext;

describe('SameOriginGuard', () => {
  const guard = new SameOriginGuard(testAppConfig());

  it.each([
    ['no Origin (non-browser client)', { host: 'api.test' }],
    ['the frontend', { origin: 'http://localhost:3000', host: 'api.test' }],
    ["the API's own origin (Swagger UI)", { origin: 'http://api.test', host: 'api.test' }],
  ])('lets %s through', (_, headers) => {
    expect(guard.canActivate(contextWith(headers))).toBe(true);
  });

  it.each([
    ['another site', 'https://evil.example'],
    ['a sibling subdomain', 'http://evil.localhost:3000'],
    ['an opaque origin', 'null'],
  ])('refuses %s', (_, origin) => {
    expect(() => guard.canActivate(contextWith({ origin, host: 'api.test' }))).toThrow(
      new ForbiddenException('Origine non autorisée'),
    );
  });

  it.each(['register', 'login', 'refresh', 'logout'] as const)(
    'guards POST /auth/%s',
    (handler) => {
      const guards = Reflect.getMetadata(
        '__guards__',
        AuthController.prototype[handler],
      ) as unknown[];
      expect(guards).toContain(SameOriginGuard);
    },
  );
});
