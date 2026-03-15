/**
 * Unit tests: GameScores model (game_scores.js)
 *
 * Tests the model layer in isolation by mocking global.dbConnection.execute.
 * Validates:
 *   - getBestScore: returns correct shape or null
 *   - saveScore: correct SQL params, isHighScore logic, UPSERT call
 *   - DB error propagation (no silent catches)
 */

const gameScoresModel = require('../../app/models/game_scores');

const mockExecute = jest.fn();

beforeAll(() => {
  global.dbConnection = { execute: mockExecute };
});

beforeEach(() => jest.clearAllMocks());

// ── getBestScore ─────────────────────────────────────────────────

describe('GameScores.getBestScore', () => {
  it('returns null when user has never played this game', async () => {
    mockExecute.mockResolvedValueOnce([[]]);

    const result = await gameScoresModel.getBestScore('abc1234', 'word_scramble');

    expect(result).toBeNull();
    expect(mockExecute).toHaveBeenCalledWith(expect.stringContaining('FROM user_best_scores'), [
      'abc1234',
      'word_scramble',
    ]);
  });

  it('returns { score, play_count, last_played } when record exists', async () => {
    const fakeDate = new Date('2025-06-15T10:00:00Z');
    mockExecute.mockResolvedValueOnce([[{ score: 250, play_count: 5, last_played: fakeDate }]]);

    const result = await gameScoresModel.getBestScore('abc1234', 'flash_match');

    expect(result).toEqual({ score: 250, play_count: 5, last_played: fakeDate });
  });

  it('propagates DB errors', async () => {
    mockExecute.mockRejectedValueOnce(new Error('ECONNRESET'));

    await expect(gameScoresModel.getBestScore('u1', 'speed_vocab')).rejects.toThrow('ECONNRESET');
  });
});

// ── saveScore ────────────────────────────────────────────────────

describe('GameScores.saveScore', () => {
  it('returns true (isHighScore) when user has never played', async () => {
    mockExecute
      .mockResolvedValueOnce([[]]) // getBestScore → no rows
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // INSERT

    const result = await gameScoresModel.saveScore('abc1234', 'vocab_quiz', 300);

    expect(result).toBe(true);
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute.mock.calls[1][0]).toMatch(/INSERT INTO user_best_scores/);
    expect(mockExecute.mock.calls[1][0]).toMatch(/ON DUPLICATE KEY UPDATE/);
    expect(mockExecute.mock.calls[1][1]).toEqual(['abc1234', 'vocab_quiz', 300, 300]);
  });

  it('returns true when new score beats current best', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ score: 200, play_count: 3, last_played: new Date() }]])
      .mockResolvedValueOnce([{ affectedRows: 2 }]); // UPDATE via UPSERT

    const result = await gameScoresModel.saveScore('abc1234', 'word_scramble', 350);

    expect(result).toBe(true);
  });

  it('returns false when new score does NOT beat current best', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ score: 500, play_count: 10, last_played: new Date() }]])
      .mockResolvedValueOnce([{ affectedRows: 2 }]);

    const result = await gameScoresModel.saveScore('abc1234', 'test_pronun', 200);

    expect(result).toBe(false);
  });

  it('returns false when new score equals current best (not strictly greater)', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ score: 100, play_count: 1, last_played: new Date() }]])
      .mockResolvedValueOnce([{ affectedRows: 2 }]);

    const result = await gameScoresModel.saveScore('abc1234', 'speed_vocab', 100);

    expect(result).toBe(false);
  });

  it('always executes the UPSERT even when not a high score (play_count must increment)', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ score: 999, play_count: 50, last_played: new Date() }]])
      .mockResolvedValueOnce([{ affectedRows: 2 }]);

    await gameScoresModel.saveScore('abc1234', 'flash_match', 10);

    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute.mock.calls[1][0]).toMatch(/ON DUPLICATE KEY UPDATE/);
    expect(mockExecute.mock.calls[1][0]).toMatch(/play_count = play_count \+ 1/);
  });

  it('uses GREATEST in SQL to ensure DB always keeps the higher score', async () => {
    mockExecute
      .mockResolvedValueOnce([[]]) // no existing score
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    await gameScoresModel.saveScore('u1', 'word_search', 42);

    const sql = mockExecute.mock.calls[1][0];
    expect(sql).toMatch(/GREATEST\(best_score, \?\)/);
  });

  it('propagates DB error from UPSERT', async () => {
    mockExecute
      .mockResolvedValueOnce([[]]) // getBestScore OK
      .mockRejectedValueOnce(new Error('Deadlock found'));

    await expect(gameScoresModel.saveScore('u1', 'vocab_quiz', 100)).rejects.toThrow(
      'Deadlock found'
    );
  });

  it('propagates DB error from getBestScore (called internally)', async () => {
    mockExecute.mockRejectedValueOnce(new Error('Connection lost'));

    await expect(gameScoresModel.saveScore('u1', 'test_pronun', 50)).rejects.toThrow(
      'Connection lost'
    );
  });
});
