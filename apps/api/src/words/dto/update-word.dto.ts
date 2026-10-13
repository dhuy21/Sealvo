import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateWordDto {
  @ApiProperty({ example: 'hello', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  word?: string;

  @ApiProperty({ example: 'en', required: false })
  @IsOptional()
  @IsString()
  language_code?: string;

  @ApiProperty({ example: 'Daily', required: false })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ enum: ['noun', 'verb', 'adjective', 'adverb', 'ph_v', 'idiom', 'collocation'], required: false })
  @IsOptional()
  @IsEnum(['noun', 'verb', 'adjective', 'adverb', 'ph_v', 'idiom', 'collocation'] as const)
  type?: string;

  @ApiProperty({ example: 'a greeting', required: false })
  @IsOptional()
  @IsString()
  meaning?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pronunciation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  synonyms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  antonyms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  example?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  grammar?: string;

  @ApiProperty({ enum: ['x', 'level_0', 'level_1', 'level_2', 'v'], required: false })
  @IsOptional()
  @IsEnum(['x', 'level_0', 'level_1', 'level_2', 'v'] as const)
  level?: string;
}
