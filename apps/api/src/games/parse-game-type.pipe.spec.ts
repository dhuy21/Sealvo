import { BadRequestException } from '@nestjs/common';
import { ALL_GAME_TYPES } from '@sealvo/shared';
import { ParseGameTypePipe } from './parse-game-type.pipe.js';

describe('ParseGameTypePipe', () => {
  const pipe = new ParseGameTypePipe();

  it('accepts every game type', () => {
    for (const type of ALL_GAME_TYPES) expect(pipe.transform(type)).toBe(type);
  });

  it.each(['invalid_game', 'constructor', '__proto__'])('rejects %s', (value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
