import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { LEVELS, VALID_LANGS, WORD_TYPES, type Level, type WordType } from '@sealvo/shared';
import { LANGUAGE_CODE_MESSAGE, TEXT_MAX_LENGTH } from './create-word.dto.js';

export class UpdateWordDto {
  @ApiProperty({ example: 'hello', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  word?: string;

  @ApiProperty({ example: 'en-US', enum: VALID_LANGS, required: false })
  @IsOptional()
  @IsIn(VALID_LANGS, { message: LANGUAGE_CODE_MESSAGE })
  language_code?: string;

  @ApiProperty({ example: 'Daily', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  subject?: string;

  @ApiProperty({ enum: WORD_TYPES, required: false })
  @IsOptional()
  @IsEnum(WORD_TYPES)
  type?: WordType;

  @ApiProperty({ example: 'a greeting', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(TEXT_MAX_LENGTH)
  meaning?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  pronunciation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX_LENGTH)
  synonyms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX_LENGTH)
  antonyms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX_LENGTH)
  example?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX_LENGTH)
  grammar?: string;

  @ApiProperty({ enum: LEVELS, required: false })
  @IsOptional()
  @IsEnum(LEVELS)
  level?: Level;
}
