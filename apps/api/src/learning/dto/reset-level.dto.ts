import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class ResetLevelDto {
  @ApiProperty({ enum: ['x', 'level_0', 'level_1', 'level_2'] })
  @IsEnum(['x', 'level_0', 'level_1', 'level_2'] as const)
  level!: string;
}
