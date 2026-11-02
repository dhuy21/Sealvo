import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TrackGameDto } from './track-game.dto.js';

describe('TrackGameDto', () => {
  it('rejects an unknown game type, so LearningService only receives GameType values', async () => {
    const errors = await validate(
      plainToInstance(TrackGameDto, { game_type: 'chess', completed: true, packageId: 1 }),
    );
    expect(errors.map((e) => e.property)).toEqual(['game_type']);
  });
});
