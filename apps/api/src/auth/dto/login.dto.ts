import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator.js';

export class LoginDto {
  @ApiProperty({ example: 'john_doe' })
  @Trim()
  @IsString()
  username!: string;

  @ApiProperty({ example: 'mypassword' })
  @IsString()
  password!: string;
}
