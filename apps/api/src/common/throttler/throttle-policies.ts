import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ThrottleMessage } from '../decorators/throttle-message.decorator.js';
import { formatDuration } from '../utils/format-duration.js';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

interface ThrottlePolicy {
  ttl: number;
  limit: number;
  /** French reason shown on 429, followed by the wait derived from ttl */
  reason: string;
}

/** Rate limits per client IP */
export const THROTTLE = {
  DEFAULT: { ttl: MINUTE_MS, limit: 100, reason: 'Trop de requêtes.' },
  REGISTER: { ttl: 15 * MINUTE_MS, limit: 5, reason: "Trop de tentatives d'inscription." },
  LOGIN: { ttl: 15 * MINUTE_MS, limit: 10, reason: 'Trop de tentatives de connexion.' },
  // Checks the current password for an email change, like a login
  PROFILE: { ttl: 15 * MINUTE_MS, limit: 10, reason: 'Trop de modifications du profil.' },
  RESET_PASSWORD: {
    ttl: 15 * MINUTE_MS,
    limit: 10,
    reason: 'Trop de tentatives de réinitialisation.',
  },
  FORGOT_PASSWORD: { ttl: HOUR_MS, limit: 3, reason: 'Trop de demandes de réinitialisation.' },
  RESEND_VERIFICATION: {
    ttl: HOUR_MS,
    limit: 3,
    reason: "Trop de demandes d'email de vérification.",
  },
  REMINDER_EMAIL: { ttl: HOUR_MS, limit: 3, reason: "Trop d'emails envoyés." },
  FEEDBACK: { ttl: HOUR_MS, limit: 5, reason: 'Trop de feedbacks envoyés.' },
  TTS: { ttl: MINUTE_MS, limit: 30, reason: 'Trop de requêtes TTS.' },
  // Each copy duplicates every word of the public package
  COPY_PACKAGE: { ttl: HOUR_MS, limit: 20, reason: 'Trop de copies de packages.' },
} as const satisfies Record<string, ThrottlePolicy>;

export const throttleMessage = ({ reason, ttl }: ThrottlePolicy) =>
  `${reason} Réessayez dans ${formatDuration(ttl)}.`;

/** Applies a policy's limit and its 429 message to a route */
export const Throttled = (policy: ThrottlePolicy) =>
  applyDecorators(
    Throttle({ default: { ttl: policy.ttl, limit: policy.limit } }),
    ThrottleMessage(throttleMessage(policy)),
  );
