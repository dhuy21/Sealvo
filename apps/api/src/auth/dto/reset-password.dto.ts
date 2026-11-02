import { ApiProperty } from '@nestjs/swagger';
import { IsByteLength, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { AUTH_LIMITS } from '@sealvo/shared';
import { PASSWORD_TOO_LONG_MESSAGE } from './register.dto.js';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Le jeton de réinitialisation est requis' })
  token!: string;

  @ApiProperty({ minLength: AUTH_LIMITS.RESET_PASSWORD_MIN })
  @IsString()
  @MinLength(AUTH_LIMITS.RESET_PASSWORD_MIN, {
    message: `Le mot de passe doit contenir au moins ${AUTH_LIMITS.RESET_PASSWORD_MIN} caractères`,
  })
  @IsByteLength(0, AUTH_LIMITS.PASSWORD_MAX_BYTES, { message: PASSWORD_TOO_LONG_MESSAGE })
  password!: string;
}
