import { ApiProperty } from '@nestjs/swagger';
import { IsByteLength, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { AUTH_LIMITS } from '@sealvo/shared';
import { PASSWORD_TOO_LONG_MESSAGE } from './register.dto.js';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ minLength: AUTH_LIMITS.RESET_PASSWORD_MIN })
  @IsString()
  @MinLength(AUTH_LIMITS.RESET_PASSWORD_MIN)
  @IsByteLength(0, AUTH_LIMITS.PASSWORD_MAX_BYTES, { message: PASSWORD_TOO_LONG_MESSAGE })
  password!: string;
}
