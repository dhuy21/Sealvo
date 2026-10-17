import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AUTH_LIMITS, AVATAR_COUNT } from '@sealvo/shared';
import { IsAccountEmail } from '../../common/decorators/is-account-email.decorator.js';
import { IsOptionalDefined } from '../../common/decorators/is-optional-defined.decorator.js';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator.js';
import { Trim } from '../../common/decorators/trim.decorator.js';

export class UpdateProfileDto {
  @ApiPropertyOptional({ minLength: AUTH_LIMITS.USERNAME_MIN, maxLength: AUTH_LIMITS.USERNAME_MAX })
  @IsOptionalDefined()
  @Trim()
  @IsString()
  @MinLength(AUTH_LIMITS.USERNAME_MIN)
  @MaxLength(AUTH_LIMITS.USERNAME_MAX)
  username?: string;

  @ApiPropertyOptional()
  @IsOptionalDefined()
  @NormalizeEmail()
  @IsAccountEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Required when `email` differs from the current email' })
  @IsOptionalDefined()
  @IsString()
  current_password?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: AVATAR_COUNT })
  @IsOptionalDefined()
  @IsInt()
  @Min(1)
  @Max(AVATAR_COUNT)
  ava?: number;
}
