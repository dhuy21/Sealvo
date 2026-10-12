import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min } from 'class-validator';

export class SaveScoreDto {
  @ApiProperty({
    enum: [
      'word_scramble',
      'flash_match',
      'speed_vocab',
      'vocab_quiz',
      'phrase_completion',
      'word_search',
      'test_pronun',
    ],
  })
  @IsEnum([
    'word_scramble',
    'flash_match',
    'speed_vocab',
    'vocab_quiz',
    'phrase_completion',
    'word_search',
    'test_pronun',
  ] as const)
  game_type!: string;

  @ApiProperty({ example: 150 })
  @IsInt()
  @Min(0)
  score!: number;
}
