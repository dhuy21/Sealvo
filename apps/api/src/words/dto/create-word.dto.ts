import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateWordDto {
  @ApiProperty({ example: 'hello' })
  @IsString()
  @MinLength(1)
  word!: string;

  @ApiProperty({ example: 'en' })
  @IsString()
  @MinLength(1)
  language_code!: string;

  @ApiProperty({ example: 'Daily' })
  @IsString()
  @MinLength(1)
  subject!: string;

  @ApiProperty({ enum: ['noun', 'verb', 'adjective', 'adverb', 'ph.v', 'idiom', 'collocation'] })
  @IsEnum(['noun', 'verb', 'adjective', 'adverb', 'ph.v', 'idiom', 'collocation'] as const)
  type!: string;

  @ApiProperty({ example: 'a greeting' })
  @IsString()
  @MinLength(1)
  meaning!: string;

  @ApiProperty({ example: '/həˈloʊ/', required: false })
  @IsOptional()
  @IsString()
  pronunciation?: string;

  @ApiProperty({ example: 'hi, hey', required: false })
  @IsOptional()
  @IsString()
  synonyms?: string;

  @ApiProperty({ example: 'goodbye', required: false })
  @IsOptional()
  @IsString()
  antonyms?: string;

  @ApiProperty({ example: 'Hello, how are you?', required: false })
  @IsOptional()
  @IsString()
  example?: string;

  @ApiProperty({ example: 'interjection', required: false })
  @IsOptional()
  @IsString()
  grammar?: string;

  @ApiProperty({ enum: ['x', '0', '1', '2', 'v'], default: 'x' })
  @IsOptional()
  @IsEnum(['x', '0', '1', '2', 'v'] as const)
  level?: string;
}
