import { ApiProperty } from '@nestjs/swagger';
import { IsByteLength, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AUTH_LIMITS, AVATAR_COUNT } from '@sealvo/shared';
import { IsAccountEmail } from '../../common/decorators/is-account-email.decorator.js';
import { IsOptionalDefined } from '../../common/decorators/is-optional-defined.decorator.js';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator.js';
import { Trim } from '../../common/decorators/trim.decorator.js';

// nosemgrep: ajinabraham.njsscan.generic.hardcoded_secrets.node_password (a message, not a password)
export const PASSWORD_TOO_LONG_MESSAGE = 'Le mot de passe est trop long';

export const AVATAR_RANGE_MESSAGE = `L'avatar doit être un nombre entre 1 et ${AVATAR_COUNT}`;
export const USERNAME_LENGTH_MESSAGE = `Le nom d'utilisateur doit contenir entre ${AUTH_LIMITS.USERNAME_MIN} et ${AUTH_LIMITS.USERNAME_MAX} caractères`;

export class RegisterDto {
  @ApiProperty({
    example: 'john_doe',
    minLength: AUTH_LIMITS.USERNAME_MIN,
    maxLength: AUTH_LIMITS.USERNAME_MAX,
  })
  @Trim()
  @IsString()
  @MinLength(AUTH_LIMITS.USERNAME_MIN, { message: USERNAME_LENGTH_MESSAGE })
  @MaxLength(AUTH_LIMITS.USERNAME_MAX, { message: USERNAME_LENGTH_MESSAGE })
  username!: string;

  @ApiProperty({ example: 'john@example.com' })
  @NormalizeEmail()
  @IsAccountEmail()
  email!: string;

  @ApiProperty({ example: 'mypassword', minLength: AUTH_LIMITS.PASSWORD_MIN })
  @IsString()
  @MinLength(AUTH_LIMITS.PASSWORD_MIN, {
    message: `Le mot de passe doit contenir au moins ${AUTH_LIMITS.PASSWORD_MIN} caractères`,
  })
  @IsByteLength(0, AUTH_LIMITS.PASSWORD_MAX_BYTES, { message: PASSWORD_TOO_LONG_MESSAGE })
  password!: string;

  @ApiProperty({ example: 1, required: false, minimum: 1, maximum: AVATAR_COUNT })
  @IsOptionalDefined()
  @IsInt({ message: AVATAR_RANGE_MESSAGE })
  @Min(1, { message: AVATAR_RANGE_MESSAGE })
  @Max(AVATAR_COUNT, { message: AVATAR_RANGE_MESSAGE })
  avatar?: number;
}
