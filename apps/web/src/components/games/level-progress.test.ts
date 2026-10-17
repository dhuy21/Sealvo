import { describe, expect, it } from 'vitest';
import { levelCompletedMessage, percentage, reachesShare } from './level-progress';

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

describe('percentage', () => {
  it('rounds to the nearest whole percent, 0 when there is no total', () => {
    expect(percentage(1, 3)).toBe(33);
    expect(percentage(2, 3)).toBe(67);
    expect(percentage(5, 0)).toBe(0);
  });
});

describe('reachesShare', () => {
  it('rounds the required count up', () => {
    expect(reachesShare(3, 3, 70)).toBe(true);
    expect(reachesShare(2, 3, 70)).toBe(false);
    expect(reachesShare(7, 10, 70)).toBe(true);
    expect(reachesShare(0, 0, 70)).toBe(true);
  });
});
