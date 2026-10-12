import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class ResetLevelDto {
  @ApiProperty({ enum: ['x', '0', '1', '2'] })
  @IsEnum(['x', '0', '1', '2'] as const)
  level!: string;
}
