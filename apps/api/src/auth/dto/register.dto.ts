import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'john_doe', minLength: 3 })
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiProperty({ example: 'john@example.com' })
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
