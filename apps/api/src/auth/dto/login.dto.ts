import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'john_doe' })
  @IsString()
  username!: string;

  @ApiProperty({ example: 'mypassword' })
  @IsString()
  password!: string;
}
