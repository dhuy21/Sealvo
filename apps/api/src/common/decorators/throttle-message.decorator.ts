import { SetMetadata } from '@nestjs/common';

export const THROTTLE_MESSAGE = 'throttle:message';
export const DEFAULT_THROTTLE_MESSAGE = 'Trop de requêtes. Réessayez dans 1 minute.';

export const ThrottleMessage = (message: string) => SetMetadata(THROTTLE_MESSAGE, message);
