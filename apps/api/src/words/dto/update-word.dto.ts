import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { LEVELS, type Level } from '@sealvo/shared';
import { IsOptionalDefined } from '../../common/decorators/is-optional-defined.decorator.js';
import { CreateWordDto } from './create-word.dto.js';

/** `skipNullProperties: false`: a `null` required column is rejected instead of reaching Prisma */
export class UpdateWordDto extends PartialType(OmitType(CreateWordDto, ['level'] as const), {
  skipNullProperties: false,
}) {
  // Redeclared without CreateWordDto's `default: 'x'`: an absent level leaves it unchanged
  @ApiProperty({ enum: LEVELS, required: false })
  @IsOptionalDefined()
  @IsEnum(LEVELS)
  level?: Level;
}
