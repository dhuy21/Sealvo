import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { ALL_GAME_TYPES, type GameType } from '@sealvo/shared';

export class SaveScoreDto {
  @ApiProperty({ enum: ALL_GAME_TYPES })
  @IsEnum(ALL_GAME_TYPES)
  game_type!: GameType;

  @ApiProperty({ example: 150 })
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  score!: number;
}
