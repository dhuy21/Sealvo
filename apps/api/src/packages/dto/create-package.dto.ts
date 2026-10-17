import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PACKAGE_MODES, type PackageMode } from '@sealvo/shared';
import { IsOptionalDefined } from '../../common/decorators/is-optional-defined.decorator.js';
import {
  TEXT_MAX_LENGTH,
  VARCHAR_MAX_LENGTH,
} from '../../common/constants/field-lengths.constants.js';

export class CreatePackageDto {
  @ApiProperty({ example: 'English Basics' })
  @IsString()
  @MinLength(1)
  @MaxLength(VARCHAR_MAX_LENGTH)
  package_name!: string;

  @ApiProperty({ example: 'Basic vocabulary for beginners', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX_LENGTH)
  package_description?: string;

  @ApiProperty({ enum: PACKAGE_MODES, default: 'private' })
  @IsOptionalDefined()
  @IsEnum(PACKAGE_MODES)
  mode?: PackageMode;
}
