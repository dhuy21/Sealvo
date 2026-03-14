/**
 * Unit tests: GameController — Phase 2+3 error handling
 *
 * Validates that:
 * - saveScore and showGame propagate DB errors (no try/catch masking)
 * - showGame degrades gracefully when word counting fails (intentional try/catch)
 * - index propagates DB errors as unhandled rejections
 *
 * Note: game_type validation moved to route-level schema middleware (Phase 3).
 * Schema validation is tested in middleware/validation integration tests.
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
// game_type validation is now handled by saveScoreSchema middleware (Phase 3).

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

  it('returns success with valid game_type', async () => {
    gameScoresModel.saveScore.mockResolvedValue(42);
    gameScoresModel.getUserGameStats.mockResolvedValue({ word_scramble: { best: 100 } });
    cache.del.mockResolvedValue(true);
    cache.set.mockResolvedValue(true);

    const req = {
      session: { user: { id: 'u1' } },
      body: { game_type: 'word_scramble', score: 100, details: { accuracy: 95 } },
    };
    const res = mockRes();

    await GameController.saveScore(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, score_id: 42 }));
  });
});

// ── showGame ────────────────────────────────────────────────────
// gameType validation is now handled by showGameSchema middleware (Phase 3).

describe('GameController.showGame — error handling', () => {
  it('still renders when word counting fails (graceful degradation)', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    cache.get.mockResolvedValueOnce({ v: 0 }).mockResolvedValueOnce([]);

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

// ── index ───────────────────────────────────────────────────────

describe('GameController.index — error handling', () => {
  it('propagates DB error (no try/catch masking)', async () => {
    cache.get.mockResolvedValue(null);
    gameScoresModel.getUserGameStats.mockRejectedValue(new Error('DB timeout'));

    const req = { session: { user: { id: 'u1' } }, query: {} };
    const res = mockRes();

    await expect(GameController.index(req, res)).rejects.toThrow('DB timeout');
  });

  it('renders game index on success', async () => {
    cache.get.mockResolvedValue({ total_games: 5 });

    const req = { session: { user: { id: 'u1' } }, query: { package: '1' } };
    const res = mockRes();

    await GameController.index(req, res);

    expect(res.render).toHaveBeenCalledWith(
      'games/index',
      expect.objectContaining({ title: 'Jeux éducatifs' })
    );
  });
});
