import { applyDecorators } from '@nestjs/common';
import { IsEmail, Matches } from 'class-validator';

/** Same pattern as the `users_email_format` CHECK (migration 005), so the DB never rejects what passed here */
export const ACCOUNT_EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const INVALID_EMAIL_MESSAGE = "Format d'email invalide";

/** An email that can be stored in `users.email` */
export function IsAccountEmail(): PropertyDecorator {
  return applyDecorators(
    IsEmail({}, { message: INVALID_EMAIL_MESSAGE }),
    Matches(ACCOUNT_EMAIL_PATTERN, { message: INVALID_EMAIL_MESSAGE }),
  );
}
