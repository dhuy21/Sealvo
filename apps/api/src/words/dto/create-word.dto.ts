import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { VALID_LANGS } from '@sealvo/shared';

/** Upper bound for TEXT columns (meaning, synonyms, antonyms, example, grammar) */
export const TEXT_MAX_LENGTH = 2000;
export const LANGUAGE_CODE_MESSAGE = `Langue invalide. Acceptées : ${VALID_LANGS.join(', ')}`;

export class CreateWordDto {
  @ApiProperty({ example: 'hello' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  word!: string;

  @ApiProperty({ example: 'en-US', enum: VALID_LANGS })
  @IsIn(VALID_LANGS, { message: LANGUAGE_CODE_MESSAGE })
  language_code!: string;

  @ApiProperty({ example: 'Daily' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  subject!: string;

  @ApiProperty({ enum: ['noun', 'verb', 'adjective', 'adverb', 'ph_v', 'idiom', 'collocation'] })
  @IsEnum(['noun', 'verb', 'adjective', 'adverb', 'ph_v', 'idiom', 'collocation'] as const)
  type!: string;

  @ApiProperty({ example: 'a greeting' })
  @IsString()
  @MinLength(1)
  @MaxLength(TEXT_MAX_LENGTH)
  meaning!: string;

  @ApiProperty({ example: '/həˈloʊ/', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  pronunciation?: string;

  @ApiProperty({ example: 'hi, hey', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX_LENGTH)
  synonyms?: string;

  @ApiProperty({ example: 'goodbye', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX_LENGTH)
  antonyms?: string;

  @ApiProperty({ example: 'Hello, how are you?', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX_LENGTH)
  example?: string;

  @ApiProperty({ example: 'interjection', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX_LENGTH)
  grammar?: string;

  @ApiProperty({ enum: ['x', 'level_0', 'level_1', 'level_2', 'v'], default: 'x' })
  @IsOptional()
  @IsEnum(['x', 'level_0', 'level_1', 'level_2', 'v'] as const)
  level?: string;
}
