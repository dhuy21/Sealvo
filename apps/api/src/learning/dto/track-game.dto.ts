import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, Min } from 'class-validator';
import { ALL_GAME_TYPES, type GameType } from '@sealvo/shared';

export class TrackGameDto {
  @ApiProperty({ enum: ALL_GAME_TYPES })
  @IsEnum(ALL_GAME_TYPES)
  game_type!: GameType;

  @ApiProperty({ example: true })
  @IsBoolean()
  completed!: boolean;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  packageId!: number;
}
