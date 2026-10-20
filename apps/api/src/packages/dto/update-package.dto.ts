import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PACKAGE_MODES, PACKAGE_NAME_MAX, type PackageMode } from '@sealvo/shared';
import { IsOptionalDefined } from '../../common/decorators/is-optional-defined.decorator.js';
import { Trim } from '../../common/decorators/trim.decorator.js';
import { TEXT_MAX_LENGTH } from '../../common/constants/field-lengths.constants.js';
import { PACKAGE_MODE_MESSAGE, PACKAGE_NAME_TOO_LONG_MESSAGE } from './create-package.dto.js';

export class UpdatePackageDto {
  @ApiProperty({ example: 'English Advanced', required: false, maxLength: PACKAGE_NAME_MAX })
  @IsOptionalDefined()
  @Trim()
  @IsString()
  @MinLength(1, { message: 'Le nom du package est requis' })
  @MaxLength(PACKAGE_NAME_MAX, { message: PACKAGE_NAME_TOO_LONG_MESSAGE })
  package_name?: string;

  // The column is nullable: `null` clears the description
  @ApiProperty({ example: 'Advanced vocabulary', required: false })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(TEXT_MAX_LENGTH)
  package_description?: string;

  @ApiProperty({ enum: PACKAGE_MODES, required: false })
  @IsOptionalDefined()
  @IsEnum(PACKAGE_MODES, { message: PACKAGE_MODE_MESSAGE })
  mode?: PackageMode;
}
