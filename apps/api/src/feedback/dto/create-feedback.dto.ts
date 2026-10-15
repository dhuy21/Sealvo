import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFeedbackDto {
  @ApiProperty({ enum: ['suggestion', 'bug', 'question', 'appreciation', 'other'] })
  @IsString()
  @IsIn(['suggestion', 'bug', 'question', 'appreciation', 'other'])
  type!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;
}
