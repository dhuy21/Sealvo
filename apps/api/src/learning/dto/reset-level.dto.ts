import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { LEVELS, type Level } from '@sealvo/shared';

const RESETTABLE_LEVELS = LEVELS.filter((level) => level !== 'v');

export class ResetLevelDto {
  @ApiProperty({ enum: RESETTABLE_LEVELS })
  @IsEnum(RESETTABLE_LEVELS)
  level!: Exclude<Level, 'v'>;
}
