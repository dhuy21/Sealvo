import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt } from 'class-validator';

export class TrackGameDto {
  @ApiProperty({
    enum: [
      'flash_match',
      'vocab_quiz',
      'word_scramble',
      'phrase_completion',
      'speed_vocab',
      'word_search',
      'test_pronun',
    ],
  })
  @IsEnum([
    'flash_match',
    'vocab_quiz',
    'word_scramble',
    'phrase_completion',
    'speed_vocab',
    'word_search',
    'test_pronun',
  ] as const)
  game_type!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  completed!: boolean;

  @ApiProperty({ example: 1 })
  @IsInt()
  packageId!: number;
}
