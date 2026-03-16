/**
 * Unit tests: cache invalidation across all controllers.
 *
 * Strategy: mock cache.del, call the write method, then verify:
 *   1. cache.del was called
 *   2. The correct keys were passed (dashboard, pkgs, gamestats)
 *
 * This is the most important test for Phase 2: if invalidation is missing,
 * users see stale data.
 */
const cache = require('../../app/core/cache');

jest.mock('../../app/core/cache', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(true),
  invalidatePattern: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../app/models/packages');
jest.mock('../../app/models/words');
jest.mock('../../app/models/learning');
jest.mock('../../app/models/users');
jest.mock('../../app/models/game_scores');
jest.mock('../../app/services/gemini');

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  redirect: jest.fn(),
  render: jest.fn(),
});

const makeReq = (overrides = {}) => ({
  session: { user: { id: 'u1' } },
  params: {},
  query: {},
  body: {},
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

// ── PackageController ───────────────────────────────────────────
describe('PackageController — cache invalidation', () => {
  const packageModel = require('../../app/models/packages');
  const PackageController = require('../../app/controllers/PackageController');

  describe('createPackagePost', () => {
    it('invalidates user packages and shared packages cache', async () => {
      packageModel.create.mockResolvedValue(1);
      const req = makeReq({ body: { name: 'Test', mode: 'private' } });
      const res = mockRes();

      await PackageController.createPackagePost(req, res);

      expect(cache.del).toHaveBeenCalledWith(['pkgs:user:u1', 'pkgs:shared']);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('deletePackagePost', () => {
    it('invalidates user packages, shared packages, dashboard, AND words cache', async () => {
      packageModel.findPackageById.mockResolvedValue({ user_id: 'u1' });
      packageModel.deletePackage.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: '1' } });
      const res = mockRes();

      await PackageController.deletePackagePost(req, res);

      expect(cache.del).toHaveBeenCalledWith([
        'pkgs:user:u1',
        'pkgs:shared',
        'dashboard:u1',
        'words:1',
      ]);
    });
  });

  describe('editPackagePost', () => {
    it('invalidates user and shared packages cache', async () => {
      packageModel.findPackageById.mockResolvedValue({ user_id: 'u1' });
      packageModel.updateInfoPackage.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: '1' }, body: { name: 'Updated' } });
      const res = mockRes();

      await PackageController.editPackagePost(req, res);

      expect(cache.del).toHaveBeenCalledWith(['pkgs:user:u1', 'pkgs:shared']);
    });
  });

  describe('toggleActivationPost', () => {
    it('invalidates user packages, shared packages, AND dashboard', async () => {
      packageModel.findPackageById.mockResolvedValue({ user_id: 'u1', is_active: true });
      packageModel.updateActivationPackage.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: '1' } });
      const res = mockRes();

      await PackageController.toggleActivationPost(req, res);

      expect(cache.del).toHaveBeenCalledWith(['pkgs:user:u1', 'pkgs:shared', 'dashboard:u1']);
    });
  });

  describe('copyPackagePost', () => {
    it('invalidates user packages, shared packages, dashboard, AND new words cache', async () => {
      const wordModel = require('../../app/models/words');
      packageModel.findPackageById.mockResolvedValue({ mode: 'public', user_id: 'other' });
      packageModel.create.mockResolvedValue(99);
      wordModel.findWordsByPackageId.mockResolvedValue([]);
      const req = makeReq({ params: { id: '1' } });
      const res = mockRes();

      await PackageController.copyPackagePost(req, res);

      expect(cache.del).toHaveBeenCalledWith([
        'pkgs:user:u1',
        'pkgs:shared',
        'dashboard:u1',
        'words:99',
      ]);
    });
  });
});

// ── WordController ──────────────────────────────────────────────
describe('WordController — cache invalidation', () => {
  const wordModel = require('../../app/models/words');
  const WordController = require('../../app/controllers/WordController');

  describe('deleteWord', () => {
    it('invalidates dashboard AND words cache after successful deletion', async () => {
      wordModel.findUsersByWordId.mockResolvedValue({ package_id: '1' });
      wordModel.deleteWord.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: '1' }, query: { package: '1' } });
      const res = mockRes();

      await WordController.deleteWord(req, res);

      expect(cache.del).toHaveBeenCalledWith(['dashboard:u1', 'words:1']);
    });
  });

  describe('deleteAllWords', () => {
    it('invalidates dashboard AND words cache when words are deleted', async () => {
      wordModel.deleteAllWords.mockResolvedValue(5);
      const req = makeReq({ query: { package: '1' } });
      const res = mockRes();

      await WordController.deleteAllWords(req, res);

      expect(cache.del).toHaveBeenCalledWith(['dashboard:u1', 'words:1']);
    });

    it('does NOT invalidate cache when no words existed', async () => {
      wordModel.deleteAllWords.mockResolvedValue(0);
      const req = makeReq({ query: { package: '1' } });
      const res = mockRes();

      await WordController.deleteAllWords(req, res);

      expect(cache.del).not.toHaveBeenCalled();
    });
  });

  describe('editWordPost', () => {
    it('invalidates dashboard AND words cache after successful edit', async () => {
      const geminiService = require('../../app/services/gemini');
      wordModel.findById.mockResolvedValue({ package_id: '1' });
      wordModel.updateWord.mockResolvedValue(undefined);
      geminiService.modifyExample.mockResolvedValue([]);

      const req = makeReq({
        params: { id: '1' },
        query: { package: '1' },
        body: {
          word: 'maison',
          language_code: 'fr',
          type: 'nom',
          meaning: 'house',
          example: 'La maison est grande.',
          level: '1',
        },
      });
      const res = mockRes();

      await WordController.editWordPost(req, res);

      expect(cache.del).toHaveBeenCalledWith(['dashboard:u1', 'words:1']);
    });
  });
});

// ── GameController ──────────────────────────────────────────────
describe('GameController — cache invalidation', () => {
  const gameScoresModel = require('../../app/models/game_scores');
  const GameController = require('../../app/controllers/gameControllers/GameController');

  describe('saveScore', () => {
    it('invalidates highscore cache for the saved game', async () => {
      gameScoresModel.saveScore.mockResolvedValue(true);

      const req = makeReq({
        body: { game_type: 'word_scramble', score: 100 },
      });
      const res = mockRes();

      await GameController.saveScore(req, res);

      expect(cache.del).toHaveBeenCalledWith('highscore:u1:word_scramble');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, isHighScore: true })
      );
    });
  });
});

// ── LearningController ──────────────────────────────────────────
describe('LearningController — cache invalidation', () => {
  const userModel = require('../../app/models/users');
  const LearningController = require('../../app/controllers/LearningController');

  it('invalidates dashboard cache when streak is updated (first time)', async () => {
    userModel.getDateUpdatedStreak.mockResolvedValue(null);
    userModel.getStreakById.mockResolvedValue({ streak: 2 });
    userModel.updateStreak.mockResolvedValue(undefined);
    userModel.updateStreakUpdatedAt.mockResolvedValue(undefined);

    const req = makeReq();
    const res = mockRes();

    await LearningController.checkAndUpdateStreak(req, res);

    expect(cache.del).toHaveBeenCalledWith('dashboard:u1');
  });

  it('invalidates dashboard cache when streak is updated (new day)', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    userModel.getDateUpdatedStreak.mockResolvedValue({
      streak_updated_at: yesterday.toISOString(),
    });
    userModel.getStreakById.mockResolvedValue({ streak: 5 });
    userModel.updateStreak.mockResolvedValue(undefined);
    userModel.updateStreakUpdatedAt.mockResolvedValue(undefined);

    const req = makeReq();
    const res = mockRes();

    await LearningController.checkAndUpdateStreak(req, res);

    expect(cache.del).toHaveBeenCalledWith('dashboard:u1');
  });

  it('does NOT invalidate cache when streak is already up to date (same day)', async () => {
    const today = new Date();
    userModel.getDateUpdatedStreak.mockResolvedValue({
      streak_updated_at: today.toISOString(),
    });
    userModel.getStreakById.mockResolvedValue({ streak: 5 });

    const req = makeReq();
    const res = mockRes();

    await LearningController.checkAndUpdateStreak(req, res);

    expect(cache.del).not.toHaveBeenCalled();
  });
});

// ── LevelProgressController — words cache invalidation ──────────
describe('LevelProgressController — words cache invalidation on level-up', () => {
  const learningModel = require('../../app/models/learning');
  const LevelProgressController = require('../../app/controllers/LevelProgressController');

  it('invalidates dashboard AND words cache when all games at a level are completed', async () => {
    learningModel.findWordsTodayByLevel.mockResolvedValue([{ detail_id: 10 }, { detail_id: 20 }]);
    learningModel.batchUpdateLevel.mockResolvedValue(2);

    cache.get.mockResolvedValueOnce({
      x: { flash_match: true, vocab_quiz: true },
    });
    cache.set.mockResolvedValue(true);

    const req = makeReq({
      body: { game_type: 'test_pronun', completed: true },
      query: { package: '55' },
    });
    const res = mockRes();

    await LevelProgressController.trackGameCompletion(req, res);

    expect(cache.del).toHaveBeenCalledWith(['dashboard:u1', 'words:55']);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ level_completed: true, words_updated: 2 })
    );
  });

  it('does NOT invalidate words cache when level is NOT yet completed', async () => {
    cache.get.mockResolvedValueOnce({});
    cache.set.mockResolvedValue(true);

    const req = makeReq({
      body: { game_type: 'flash_match', completed: true },
      query: { package: '55' },
    });
    const res = mockRes();

    await LevelProgressController.trackGameCompletion(req, res);

    expect(cache.del).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ level_completed: false }));
  });
});
