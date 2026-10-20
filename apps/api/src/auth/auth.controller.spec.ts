import { testAppConfig } from '../config/testing.js';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { THROTTLE_MESSAGE } from '../common/decorators/throttle-message.decorator.js';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';
import type { EmailVerificationService } from './email-verification.service.js';
import type { GoogleAuthService } from './google-auth.service.js';
import type { PasswordResetService } from './password-reset.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { login: any; refreshTokens: any };
  let emailVerification: { resendVerification: any };

  beforeEach(() => {
    authService = {
      login: vi.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }),
      refreshTokens: vi.fn(),
    };
    emailVerification = { resendVerification: vi.fn().mockResolvedValue({ message: 'ok' }) };
    controller = new AuthController(
      authService as unknown as AuthService,
      emailVerification as unknown as EmailVerificationService,
      {} as PasswordResetService,
      {} as GoogleAuthService,
      testAppConfig(),
    );
  });

  it('gives the refresh cookie the 7-day session lifetime', async () => {
    const res = { cookie: vi.fn() };

    await controller.login({ username: 'john', password: 'x' }, res as unknown as Response);

    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'r',
      expect.objectContaining({ maxAge: 7 * 86_400_000 }),
    );
  });

  it.each([
    ['clears the cookie of a rejected session', new UnauthorizedException(), 1],
    ['keeps the cookie during an outage', new ServiceUnavailableException(), 0],
  ] as const)('refresh %s', async (_, error, cleared) => {
    authService.refreshTokens.mockRejectedValue(error);
    const res = { clearCookie: vi.fn() };
    const req = { cookies: { refresh_token: 'r' } };

    await expect(
      controller.refresh(req as unknown as Request, res as unknown as Response),
    ).rejects.toBe(error);
    expect(res.clearCookie).toHaveBeenCalledTimes(cleared);
  });

  it('delegates resend-verification with the username', async () => {
    await expect(controller.resendVerification({ username: 'john' })).resolves.toEqual({
      message: 'ok',
    });
    expect(emailVerification.resendVerification).toHaveBeenCalledWith('john');
  });

  it.each([
    ['resetPassword', 'Trop de tentatives de réinitialisation. Réessayez dans 15 minutes.'],
    ['resendVerification', "Trop de demandes d'email de vérification. Réessayez dans 1 heure."],
  ] as const)('%s has its own throttle message', (handler, message) => {
    expect(Reflect.getMetadata(THROTTLE_MESSAGE, AuthController.prototype[handler])).toBe(message);
  });
});
