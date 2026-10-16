import { IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ minLength: 3, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Required when `email` differs from the current email' })
  @IsOptional()
  @IsString()
  current_password?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 11 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(11)
  ava?: number;
}
