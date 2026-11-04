import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { INVALID_EMAIL_MESSAGE } from '../../common/decorators/is-account-email.decorator.js';
import { Trim } from '../../common/decorators/trim.decorator.js';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @Trim()
  @IsEmail({}, { message: INVALID_EMAIL_MESSAGE })
  @IsNotEmpty({ message: "L'adresse email est requise" })
  email!: string;
}
