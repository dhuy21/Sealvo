import { applyDecorators } from '@nestjs/common';
import { IsEmail, Matches } from 'class-validator';

/** Same pattern as the `users_email_format` CHECK (migration 005), so the DB never rejects what passed here */
export const ACCOUNT_EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** An email that can be stored in `users.email` */
export function IsAccountEmail(): PropertyDecorator {
  return applyDecorators(
    IsEmail(),
    Matches(ACCOUNT_EMAIL_PATTERN, { message: "Format d'email invalide" }),
  );
}
