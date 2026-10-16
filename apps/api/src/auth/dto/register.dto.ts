import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator.js';

const USERNAME_LENGTH_MESSAGE = "Le nom d'utilisateur doit contenir entre 3 et 50 caractères";

export class RegisterDto {
  @ApiProperty({ example: 'john_doe', minLength: 3, maxLength: 50 })
  @IsString()
  @MinLength(3, { message: USERNAME_LENGTH_MESSAGE })
  @MaxLength(50, { message: USERNAME_LENGTH_MESSAGE })
  username!: string;

  @ApiProperty({ example: 'john@example.com' })
  @NormalizeEmail()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'mypassword', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 1, required: false, minimum: 1, maximum: 11 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(11)
  avatar?: number;
}
