import { ApiProperty } from '@nestjs/swagger';
import { IsByteLength, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator.js';
import { VARCHAR_MAX_LENGTH } from '../../common/constants/field-lengths.constants.js';
import { PASSWORD_TOO_LONG_MESSAGE } from './register.dto.js';

/**
 * Old accounts were created without length limits (and bcrypt ignores bytes past 72), so the caps
 * stay above anything an existing account can hold: the username column size, and 1 KB.
 */
const LOGIN_PASSWORD_MAX_BYTES = 1024;

export class LoginDto {
  @ApiProperty({ example: 'john_doe', maxLength: VARCHAR_MAX_LENGTH })
  @Trim()
  @IsString()
  @MaxLength(VARCHAR_MAX_LENGTH, { message: "Le nom d'utilisateur est trop long" })
  username!: string;

  @ApiProperty({ example: 'mypassword' })
  @IsString()
  @IsByteLength(0, LOGIN_PASSWORD_MAX_BYTES, { message: PASSWORD_TOO_LONG_MESSAGE })
  password!: string;
}
