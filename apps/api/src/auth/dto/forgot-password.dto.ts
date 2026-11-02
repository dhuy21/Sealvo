import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { INVALID_EMAIL_MESSAGE } from '../../common/decorators/is-account-email.decorator.js';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator.js';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @NormalizeEmail()
  @IsEmail({}, { message: INVALID_EMAIL_MESSAGE })
  @IsNotEmpty({ message: "L'adresse email est requise" })
  email!: string;
}
