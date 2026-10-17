import { SetMetadata } from '@nestjs/common';

export const THROTTLE_MESSAGE = 'throttle:message';

export const ThrottleMessage = (message: string) => SetMetadata(THROTTLE_MESSAGE, message);
