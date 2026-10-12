/**
 * Unit tests: Game API controllers — Phase 2 error handling
 *
 * Validates that after removing try/catch blocks:
 * - FlashMatch / VocabQuiz throw NotFoundError when insufficient words
 * - WordSearch throws NotFoundError when no words found
 * - All controllers propagate DB errors as unhandled rejections
 * - Errors are NOT silently caught and returned as { error: "..." }
 */
const learningModel = require('../../app/models/learning');
const { NotFoundError } = require('../../app/errors/AppError');

jest.mock('../../app/models/learning');
jest.mock('../../app/core/cache', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(true),
}));

const FlashMatchController = require('../../app/controllers/gameControllers/FlashMatchController');
const VocabQuizController = require('../../app/controllers/gameControllers/VocabQuizController');
const WordSearchController = require('../../app/controllers/gameControllers/WordSearchController');
const SpeedVocabController = require('../../app/controllers/gameControllers/SpeedVocabController');
const WordScrambleController = require('../../app/controllers/gameControllers/WordScrambleController');
const TestPronunController = require('../../app/controllers/gameControllers/TestPronunController');
const PhraseCompletionController = require('../../app/controllers/gameControllers/PhraseCompletionController');

const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

const makeWords = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    word: `word${i}`,
    type: 'nom',
    meaning: `meaning${i}`,
    pronunciation: 'pron',
    language_code: 'fr',
    example: `La **word${i}** est grande.`,
  }));

beforeEach(() => jest.clearAllMocks());

// ── FlashMatchController ────────────────────────────────────────

describe('FlashMatchController — error handling', () => {
  it('throws NotFoundError when fewer than 4 words available', async () => {
    learningModel.findWordsWithDetailsByLevel.mockResolvedValue(makeWords(3));
    const req = { query: { package: '1' } };
    const res = mockRes();

    await expect(FlashMatchController.getCardsForFlashMatch(req, res)).rejects.toThrow(
      NotFoundError
    );
  });

  it('succeeds with exactly 4 words (minimum)', async () => {
    learningModel.findWordsWithDetailsByLevel.mockResolvedValue(makeWords(4));
    const req = { query: { package: '1' } };
    const res = mockRes();

    await FlashMatchController.getCardsForFlashMatch(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ cards: expect.any(Array), wordIds: expect.any(Array) })
    );
  });

  it('propagates DB error', async () => {
    learningModel.findWordsWithDetailsByLevel.mockRejectedValue(new Error('DB error'));
    const req = { query: { package: '1' } };
    const res = mockRes();

    await expect(FlashMatchController.getCardsForFlashMatch(req, res)).rejects.toThrow('DB error');
  });
});

// ── VocabQuizController ─────────────────────────────────────────

describe('VocabQuizController — error handling', () => {
  it('throws NotFoundError when fewer than 6 words available', async () => {
    learningModel.findWordsWithDetailsByLevel.mockResolvedValue(makeWords(5));
    const req = { query: { package: '1' } };
    const res = mockRes();

    await expect(VocabQuizController.getQuestionForVocabQuiz(req, res)).rejects.toThrow(
      NotFoundError
    );
  });

  it('succeeds with exactly 6 words', async () => {
    learningModel.findWordsWithDetailsByLevel.mockResolvedValue(makeWords(6));
    const req = { query: { package: '1' } };
    const res = mockRes();

    await VocabQuizController.getQuestionForVocabQuiz(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ questionWords: expect.any(Array) })
    );
  });

  it('getAvailableWordsCount returns count', async () => {
    learningModel.countUserWordsByLevel.mockResolvedValue(10);
    const req = { query: { package: '1' } };
    const res = mockRes();

    await VocabQuizController.getAvailableWordsCount(req, res);

    expect(res.json).toHaveBeenCalledWith({ success: true, count: 10 });
  });

  it('getAvailableWordsCount propagates DB error', async () => {
    learningModel.countUserWordsByLevel.mockRejectedValue(new Error('DB error'));
    const req = { query: { package: '1' } };
    const res = mockRes();

    await expect(VocabQuizController.getAvailableWordsCount(req, res)).rejects.toThrow('DB error');
  });
});

// ── WordSearchController ────────────────────────────────────────

describe('WordSearchController — error handling', () => {
  it('throws NotFoundError when no words found', async () => {
    learningModel.getRandomUserWords.mockResolvedValue([]);
    const req = { query: { package: '1' } };
    const res = mockRes();

    await expect(WordSearchController.getWordsForGame(req, res)).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when result is null', async () => {
    learningModel.getRandomUserWords.mockResolvedValue(null);
    const req = { query: { package: '1' } };
    const res = mockRes();

    await expect(WordSearchController.getWordsForGame(req, res)).rejects.toThrow(NotFoundError);
  });

  it('propagates DB error', async () => {
    learningModel.getRandomUserWords.mockRejectedValue(new Error('DB error'));
    const req = { query: { package: '1' } };
    const res = mockRes();

    await expect(WordSearchController.getWordsForGame(req, res)).rejects.toThrow('DB error');
  });
});

// ── Controllers without explicit throw — DB error propagation ───

describe('DB error propagation (try/catch removed)', () => {
  const dbError = new Error('connection refused');

  beforeEach(() => {
    learningModel.findWordsWithDetailsByLevel.mockRejectedValue(dbError);
  });

  it('SpeedVocabController propagates DB error', async () => {
    const req = { query: { package: '1' } };
    const res = mockRes();
    await expect(SpeedVocabController.getWordsForSpeedVocab(req, res)).rejects.toThrow(dbError);
  });

  it('WordScrambleController propagates DB error', async () => {
    const req = { query: { package: '1' } };
    const res = mockRes();
    await expect(WordScrambleController.getRandomWordsForScramble(req, res)).rejects.toThrow(
      dbError
    );
  });

  it('TestPronunController propagates DB error', async () => {
    const req = { query: { package: '1' } };
    const res = mockRes();
    await expect(TestPronunController.getWordsForTestPronun(req, res)).rejects.toThrow(dbError);
  });

  it('PhraseCompletionController.getPhrasesForCompletion propagates DB error', async () => {
    const req = { query: { package: '1' } };
    const res = mockRes();
    await expect(PhraseCompletionController.getPhrasesForCompletion(req, res)).rejects.toThrow(
      dbError
    );
  });

  it('PhraseCompletionController.getAvailableWordsCount propagates DB error', async () => {
    learningModel.countUserWordsByLevel.mockRejectedValue(dbError);
    const req = { query: { package: '1' } };
    const res = mockRes();
    await expect(PhraseCompletionController.getAvailableWordsCount(req, res)).rejects.toThrow(
      dbError
    );
  });
});
