import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['refresh_token'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  validate(payload: { sub: string; username: string; role: string }) {
    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}
