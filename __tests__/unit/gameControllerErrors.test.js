/**
 * Unit tests: GameController — error handling
 *
 * Validates that:
 * - saveScore propagates DB errors (no try/catch masking)
 * - showGame degrades gracefully when word counting fails (intentional try/catch)
 *
 * Note: game_type validation moved to route-level schema middleware (Phase 3).
 */
const cache = require('../../app/core/cache');
const gameScoresModel = require('../../app/models/game_scores');
const learningModel = require('../../app/models/learning');

jest.mock('../../app/core/cache', () => ({
  get: jest.fn(),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../app/models/game_scores');
jest.mock('../../app/models/learning');

const GameController = require('../../app/controllers/gameControllers/GameController');

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  render: jest.fn(),
});

beforeEach(() => jest.clearAllMocks());

// ── saveScore ───────────────────────────────────────────────────

describe('GameController.saveScore — error handling', () => {
  it('propagates DB error (no try/catch masking)', async () => {
    gameScoresModel.saveScore.mockRejectedValue(new Error('DB connection lost'));
    const req = {
      session: { user: { id: 'u1' } },
      body: { game_type: 'word_scramble', score: 100 },
    };
    const res = mockRes();

    await expect(GameController.saveScore(req, res)).rejects.toThrow('DB connection lost');
  });

  it('returns success with isHighScore flag', async () => {
    gameScoresModel.saveScore.mockResolvedValue(true);
    cache.del.mockResolvedValue(true);

    const req = {
      session: { user: { id: 'u1' } },
      body: { game_type: 'word_scramble', score: 100 },
    };
    const res = mockRes();

    await GameController.saveScore(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, isHighScore: true })
    );
  });
});

// ── showGame ────────────────────────────────────────────────────

describe('GameController.showGame — error handling', () => {
  it('still renders when word counting fails (graceful degradation)', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    cache.get.mockResolvedValueOnce({ v: 0 });

    learningModel.countUserWordsByLevel.mockRejectedValue(new Error('count failed'));
    learningModel.getNumWordsByLevel.mockRejectedValue(new Error('count failed'));

    const req = {
      session: { user: { id: 'u1' } },
      params: { gameType: 'wordScramble' },
      query: { package: '1' },
    };
    const res = mockRes();

    await GameController.showGame(req, res);

    expect(res.render).toHaveBeenCalledWith(
      'games/wordScramble',
      expect.objectContaining({ wordCount: 0 })
    );
    spy.mockRestore();
  });
});
