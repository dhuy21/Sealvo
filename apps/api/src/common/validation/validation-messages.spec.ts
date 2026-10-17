import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import {
  VALIDATION_PIPE_OPTIONS,
  translateValidationMessage,
  validationExceptionFactory,
} from './validation-messages.js';

class Sample {
  @IsString()
  @MaxLength(5)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  count!: number;

  @IsString()
  @MaxLength(3, { message: 'Message de la vieille app' })
  custom!: string;
}

const messagesFor = async (body: unknown): Promise<string[]> => {
  const pipe = new ValidationPipe(VALIDATION_PIPE_OPTIONS);
  try {
    await pipe.transform(body, { type: 'body', metatype: Sample });
  } catch (err) {
    return (err as { getResponse(): { message: string[] } }).getResponse().message;
  }
  return [];
};

describe('validation messages', () => {
  it('translates the default messages and keeps the custom ones', async () => {
    const messages = await messagesFor({ name: 'too long', count: 0, custom: 'abcd', extra: 1 });

    expect(messages).toEqual(
      expect.arrayContaining([
        'Le champ « name » ne doit pas dépasser 5 caractères',
        'Le champ « count » doit être supérieur ou égal à 1',
        'Message de la vieille app',
        "Le champ « extra » n'est pas autorisé",
      ]),
    );
    expect(messages).toHaveLength(4);
  });

  it('translates the other common rules', () => {
    expect(translateValidationMessage('name must be a string')).toBe(
      'Le champ « name » doit être un texte',
    );
    expect(translateValidationMessage('email must be an email')).toBe("Format d'email invalide");
    expect(translateValidationMessage('mode must be one of the following values: a, b')).toBe(
      'Le champ « mode » doit valoir : a, b',
    );
    expect(translateValidationMessage('token should not be empty')).toBe(
      'Le champ « token » est requis',
    );
  });

  it('accepts the plain messages ParseArrayPipe builds and drops duplicates', () => {
    const res = validationExceptionFactory([
      'Validation failed (parsable array expected)',
      'Validation failed (parsable array expected)',
    ]).getResponse() as { message: string[] };

    expect(res.message).toEqual(['Une liste est attendue']);
  });
});
