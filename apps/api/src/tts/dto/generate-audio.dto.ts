import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { VALID_LANGS } from '@sealvo/shared';
import { Trim } from '../../common/decorators/trim.decorator.js';

/** Long enough for example sentences; Google's 5000-byte request limit holds even at 4 bytes per character */
const TEXT_MAX = 500;

export class GenerateAudioDto {
  @ApiProperty({ example: 'hello', maxLength: TEXT_MAX })
  @Trim()
  @IsString({ message: 'Le texte est requis' })
  @IsNotEmpty({ message: 'Le texte est requis' })
  @MaxLength(TEXT_MAX, { message: `Le texte ne doit pas dépasser ${TEXT_MAX} caractères` })
  text!: string;

  @ApiProperty({ example: 'en-US', enum: VALID_LANGS })
  @IsString({ message: 'La langue est requise' })
  @IsIn(VALID_LANGS, { message: 'Langue invalide. Format attendu : en-US' })
  language!: string;
}
