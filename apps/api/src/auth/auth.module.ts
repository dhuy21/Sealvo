import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { authConfig, type AuthConfig } from '../config/auth.config.js';
import { ACCESS_TOKEN_TTL } from './auth.constants.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { SessionService } from './session.service.js';
import { TokenService } from './token.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { EmailChangeService } from './email-change.service.js';
import { PasswordResetService } from './password-reset.service.js';
import { GoogleAuthService } from './google-auth.service.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [
    PassportModule,
    EmailModule,
    JwtModule.registerAsync({
      inject: [authConfig.KEY],
      useFactory: (config: AuthConfig) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: ACCESS_TOKEN_TTL, algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    TokenService,
    EmailVerificationService,
    EmailChangeService,
    PasswordResetService,
    GoogleAuthService,
    JwtStrategy,
  ],
  exports: [EmailChangeService],
})
export class AuthModule {}
