import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // expires after 7 days without a refresh
/** Concurrent refreshes (several tabs, StrictMode) present the token that was just rotated. */
const ROTATION_LEEWAY_MS = 30_000;
const MAX_ROTATION_ATTEMPTS = 3;

const hash = (secret: string) => createHash('sha256').update(secret).digest('hex');
const sameHash = (a: string, b: string) => timingSafeEqual(Buffer.from(a), Buffer.from(b));
const newSecret = () => randomBytes(32).toString('hex');
const expiry = () => new Date(Date.now() + SESSION_TTL_MS);

/** Refresh token format: `<sessionId>.<secret>` (opaque, only the secret's hash is stored). */
function parse(token: string | undefined): { id: string; secret: string } | null {
  const [id, secret, ...rest] = (token ?? '').split('.');
  return id?.length === 36 && secret?.length === 64 && rest.length === 0 ? { id, secret } : null;
}

/**
 * Refresh sessions, one per logged-in device: rotation with reuse detection
 * (RFC 9700 §4.14.2), revocation on logout and password reset.
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string): Promise<string> {
    const secret = newSecret();
    const session = await this.prisma.refresh_sessions.create({
      data: { id: randomUUID(), user_id: userId, token_hash: hash(secret), expires_at: expiry() },
    });
    return `${session.id}.${secret}`;
  }

  /** Returns the session owner and a new refresh token, or null when the token must be rejected. */
  async rotate(token: string | undefined): Promise<{ userId: string; token: string } | null> {
    const parsed = parse(token);
    if (!parsed) return null;
    const presented = hash(parsed.secret);

    for (let attempt = 0; attempt < MAX_ROTATION_ATTEMPTS; attempt++) {
      const session = await this.prisma.refresh_sessions.findUnique({ where: { id: parsed.id } });
      if (!session || session.expires_at <= new Date()) return null;

      const isCurrent = sameHash(presented, session.token_hash);
      const isJustRotated =
        !!session.previous_hash &&
        !!session.rotated_at &&
        Date.now() - session.rotated_at.getTime() <= ROTATION_LEEWAY_MS &&
        sameHash(presented, session.previous_hash);

      if (!isCurrent && !isJustRotated) {
        // Only tokens issued for this session carry its id: an older one is being replayed
        this.logger.warn(`Refresh token reuse: session ${session.id} of user ${session.user_id} revoked`);
        await this.prisma.refresh_sessions.deleteMany({ where: { id: session.id } });
        return null;
      }

      const secret = newSecret();
      // Compare-and-swap: a concurrent rotation makes this match nothing, then we re-read
      const { count } = await this.prisma.refresh_sessions.updateMany({
        where: { id: session.id, token_hash: session.token_hash },
        data: {
          previous_hash: session.token_hash,
          token_hash: hash(secret),
          rotated_at: new Date(),
          expires_at: expiry(),
        },
      });
      if (count === 1) return { userId: session.user_id, token: `${session.id}.${secret}` };
    }
    return null;
  }

  async revoke(token: string | undefined): Promise<void> {
    const parsed = parse(token);
    if (parsed) await this.prisma.refresh_sessions.deleteMany({ where: { id: parsed.id } });
  }
}
