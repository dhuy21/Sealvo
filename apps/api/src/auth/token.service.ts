import { Injectable } from '@nestjs/common';
import type { users_role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from './session.service.js';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly sessions: SessionService,
  ) {}

  signAccessToken(user: { id: string; username: string; role: users_role }) {
    return this.jwt.sign({ sub: user.id, username: user.username, role: user.role });
  }

  /** Access token (JWT, 15 min) + a new refresh session for this device */
  async issueTokens(user: { id: string; username: string; role: users_role }) {
    return {
      accessToken: this.signAccessToken(user),
      refreshToken: await this.sessions.create(user.id),
    };
  }
}
