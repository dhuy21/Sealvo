import { ApiProperty } from '@nestjs/swagger';
import {
  IsByteLength,
  IsEmail,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AUTH_LIMITS, AVATAR_COUNT } from '@sealvo/shared';
import { IsOptionalDefined } from '../../common/decorators/is-optional-defined.decorator.js';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator.js';
import { Trim } from '../../common/decorators/trim.decorator.js';

export const PASSWORD_TOO_LONG_MESSAGE = 'Le mot de passe est trop long';

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
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'mypassword', minLength: AUTH_LIMITS.PASSWORD_MIN })
  @IsString()
  @MinLength(AUTH_LIMITS.PASSWORD_MIN)
  @IsByteLength(0, AUTH_LIMITS.PASSWORD_MAX_BYTES, { message: PASSWORD_TOO_LONG_MESSAGE })
  password!: string;

  @ApiProperty({ example: 1, required: false, minimum: 1, maximum: AVATAR_COUNT })
  @IsOptionalDefined()
  @IsInt()
  @Min(1)
  @Max(AVATAR_COUNT)
  avatar?: number;
}
