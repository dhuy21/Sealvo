import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsOptionalDefined } from '../../common/decorators/is-optional-defined.decorator.js';
import { Trim } from '../../common/decorators/trim.decorator.js';

const SUBJECT_MAX = 255;
const CONTENT_MAX = 5000;

export class CreateFeedbackDto {
  @ApiProperty({ enum: ['suggestion', 'bug', 'question', 'appreciation', 'other'] })
  @IsString()
  @IsIn(['suggestion', 'bug', 'question', 'appreciation', 'other'])
  type!: string;

  @ApiProperty({ maxLength: SUBJECT_MAX })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Le sujet est requis' })
  @MaxLength(SUBJECT_MAX, { message: `Le sujet ne doit pas dépasser ${SUBJECT_MAX} caractères` })
  subject!: string;

  @ApiProperty({ maxLength: CONTENT_MAX })
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Le contenu est requis' })
  @MaxLength(CONTENT_MAX, { message: `Le contenu ne doit pas dépasser ${CONTENT_MAX} caractères` })
  content!: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim() || undefined;
  })
  @IsOptionalDefined()
  @IsEmail({}, { message: "Format d'email invalide" })
  email?: string;
}
