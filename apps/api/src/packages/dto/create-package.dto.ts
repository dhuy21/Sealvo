import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PACKAGE_MODES, PACKAGE_NAME_MAX, type PackageMode } from '@sealvo/shared';
import { IsOptionalDefined } from '../../common/decorators/is-optional-defined.decorator.js';
import { Trim } from '../../common/decorators/trim.decorator.js';
import { TEXT_MAX_LENGTH } from '../../common/constants/field-lengths.constants.js';

export const PACKAGE_NAME_TOO_LONG_MESSAGE = `Le nom du package ne doit pas dépasser ${PACKAGE_NAME_MAX} caractères`;
export const PACKAGE_MODE_MESSAGE = `Mode invalide. Acceptés : ${PACKAGE_MODES.join(', ')}`;

export class CreatePackageDto {
  @ApiProperty({ example: 'English Basics', maxLength: PACKAGE_NAME_MAX })
  @Trim()
  @IsString()
  @MinLength(1, { message: 'Le nom du package est requis' })
  @MaxLength(PACKAGE_NAME_MAX, { message: PACKAGE_NAME_TOO_LONG_MESSAGE })
  package_name!: string;

  @ApiProperty({ example: 'Basic vocabulary for beginners', required: false })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(TEXT_MAX_LENGTH)
  package_description?: string;

  @ApiProperty({ enum: PACKAGE_MODES, default: 'private' })
  @IsOptionalDefined()
  @IsEnum(PACKAGE_MODES, { message: PACKAGE_MODE_MESSAGE })
  mode?: PackageMode;
}
