import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { LEVELS, VALID_LANGS, WORD_TYPES, type Level, type WordType } from '@sealvo/shared';
import { IsOptionalDefined } from '../../common/decorators/is-optional-defined.decorator.js';
import { Trim } from '../../common/decorators/trim.decorator.js';
import {
  TEXT_MAX_LENGTH,
  VARCHAR_MAX_LENGTH,
} from '../../common/constants/field-lengths.constants.js';

export const LANGUAGE_CODE_MESSAGE = `Langue invalide. Acceptées : ${VALID_LANGS.join(', ')}`;

export class CreateWordDto {
  @ApiProperty({ example: 'hello' })
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(VARCHAR_MAX_LENGTH)
  word!: string;

  @ApiProperty({ example: 'en-US', enum: VALID_LANGS })
  @IsIn(VALID_LANGS, { message: LANGUAGE_CODE_MESSAGE })
  language_code!: string;

  @ApiProperty({ example: 'Daily' })
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(VARCHAR_MAX_LENGTH)
  subject!: string;

  @ApiProperty({ enum: WORD_TYPES })
  @IsEnum(WORD_TYPES)
  type!: WordType;

  @ApiProperty({ example: 'a greeting' })
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(TEXT_MAX_LENGTH)
  meaning!: string;

  @ApiProperty({ example: '/həˈloʊ/', required: false })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(VARCHAR_MAX_LENGTH)
  pronunciation?: string;

  @ApiProperty({ example: 'hi, hey', required: false })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(TEXT_MAX_LENGTH)
  synonyms?: string;

  @ApiProperty({ example: 'goodbye', required: false })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(TEXT_MAX_LENGTH)
  antonyms?: string;

  @ApiProperty({ example: 'Hello, how are you?', required: false })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(TEXT_MAX_LENGTH)
  example?: string;

  @ApiProperty({ example: 'interjection', required: false })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(TEXT_MAX_LENGTH)
  grammar?: string;

  @ApiProperty({ enum: LEVELS, default: 'x' })
  @IsOptionalDefined()
  @IsEnum(LEVELS)
  level?: Level;
}
