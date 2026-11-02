import { BadRequestException, type ValidationPipeOptions } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

/**
 * class-validator's English default messages, in French. A decorator given its own `message` (the
 * old app's texts) is left as is.
 */
const TRANSLATIONS: [RegExp, (...groups: string[]) => string][] = [
  [/^property (\S+) should not exist$/, (p) => `Le champ « ${p} » n'est pas autorisé`],
  [/^(\S+) should not be empty$/, (p) => `Le champ « ${p} » est requis`],
  [/^(\S+) must be a string$/, (p) => `Le champ « ${p} » doit être un texte`],
  [
    /^(\S+) must be longer than or equal to (\d+) characters?$/,
    (p, n) => `Le champ « ${p} » doit contenir au moins ${n} caractère(s)`,
  ],
  [
    /^(\S+) must be shorter than or equal to (\d+) characters?$/,
    (p, n) => `Le champ « ${p} » ne doit pas dépasser ${n} caractères`,
  ],
  [/^(\S+) must be an email$/, () => "Format d'email invalide"],
  [/^(\S+) must be an integer number$/, (p) => `Le champ « ${p} » doit être un nombre entier`],
  [/^(\S+) must be a boolean value$/, (p) => `Le champ « ${p} » doit être vrai ou faux`],
  [
    /^(\S+) must not be less than (\S+)$/,
    (p, n) => `Le champ « ${p} » doit être supérieur ou égal à ${n}`,
  ],
  [
    /^(\S+) must not be greater than (\S+)$/,
    (p, n) => `Le champ « ${p} » doit être inférieur ou égal à ${n}`,
  ],
  [
    /^(\S+) must be one of the following values: (.*)$/,
    (p, values) => `Le champ « ${p} » doit valoir : ${values}`,
  ],
  [/^Validation failed \(parsable array expected\)$/, () => 'Une liste est attendue'],
];

export function translateValidationMessage(message: string): string {
  for (const [pattern, translate] of TRANSLATIONS) {
    const match = pattern.exec(message);
    if (match) return translate(...match.slice(1));
  }
  return message;
}

const messagesOf = (error: ValidationError): string[] => [
  ...Object.values(error.constraints ?? {}),
  ...(error.children ?? []).flatMap(messagesOf),
];

/** Also receives the plain messages ParseArrayPipe builds itself */
export function validationExceptionFactory(
  errors: ValidationError[] | string[] | string,
): BadRequestException {
  const messages = (typeof errors === 'string' ? [errors] : errors).flatMap((error) =>
    typeof error === 'string' ? [error] : messagesOf(error),
  );
  // Two rules of one field may share a message (e.g. both email checks)
  return new BadRequestException([...new Set(messages.map(translateValidationMessage))]);
}

/** The global pipe (main.ts); the specs build the same one */
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: validationExceptionFactory,
};
