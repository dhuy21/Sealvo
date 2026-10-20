import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { AUTH_LIMITS } from '@sealvo/shared';
import { Trim } from '../../common/decorators/trim.decorator.js';
import { USERNAME_LENGTH_MESSAGE } from './register.dto.js';

export class ResendVerificationDto {
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
}
