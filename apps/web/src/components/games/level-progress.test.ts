import { describe, expect, it } from 'vitest';
import { levelCompletedMessage } from './level-progress';

describe('levelCompletedMessage', () => {
  it('announces the promoted words and their new level', () => {
    expect(levelCompletedMessage({ success: true, level_completed: true, words_updated: 4, to_level: 'level_1' })).toBe(
      'Niveau terminé! 4 mots sont passés au niveau 1',
    );
    expect(levelCompletedMessage({ success: true, level_completed: true, words_updated: 1, to_level: 'v' })).toBe(
      'Niveau terminé! 1 mots sont passés au niveau v',
    );
  });

  it('is null when the level is not completed or no word was promoted', () => {
    expect(levelCompletedMessage({ success: true, level_completed: false, words_updated: 4, to_level: 'level_1' })).toBeNull();
    expect(levelCompletedMessage({ success: true, level_completed: true, words_updated: 0, to_level: 'level_1' })).toBeNull();
    expect(levelCompletedMessage({ success: true, level_completed: true })).toBeNull();
  });
});
