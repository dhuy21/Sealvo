/**
 * Unit tests: Game optimizations.
 *
 * Part A — GameController.showGame: high score cache-aside with { v: highScore } wrapper
 *   - Cache HIT: unwraps wrapper, does NOT query DB
 *   - Cache MISS: queries DB, wraps and caches result
 *   - Null high score (new player): wrapper stores { v: null }, next read unwraps correctly
 *
 * Part B — Game controllers: N+1 fix (findWordsWithDetailsByLevel)
 *   - Each controller calls findWordsWithDetailsByLevel (1 query) NOT findWordsByLevel + findById (N+1)
 *   - Data mapping is correct for each game's specific needs
 */
const cache = require('../../app/core/cache');
const gameScoresModel = require('../../app/models/game_scores');
const learningModel = require('../../app/models/learning');
const CACHE_TTL = require('../../app/config/cache');

jest.mock('../../app/core/cache', () => ({
  get: jest.fn(),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(true),
  invalidatePattern: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../app/models/game_scores');
jest.mock('../../app/models/learning');
jest.mock('../../app/models/words');
jest.mock('../../app/middleware/flash', () => ({
  setFlash: jest.fn(),
}));

const GameController = require('../../app/controllers/gameControllers/GameController');

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  redirect: jest.fn(),
  render: jest.fn(),
});

const makeReq = (gameType = 'wordScramble', pkg = '42') => ({
  session: { user: { id: 'u1' } },
  params: { gameType },
  query: { package: pkg },
});

beforeEach(() => jest.clearAllMocks());

// ── Part A: showGame — high score cache ─────────────────────────
describe('GameController.showGame — high score cache-aside', () => {
  beforeEach(() => {
    learningModel.countUserWordsByLevel.mockResolvedValue(10);
    learningModel.getNumWordsByLevel.mockResolvedValue(10);
  });

  it('reads high score from cache on HIT (wrapper { v: ... })', async () => {
    const fakeScore = { score: 500 };
    cache.get.mockResolvedValueOnce({ v: fakeScore }); // highscore cache HIT
    const req = makeReq('wordScramble');
    const res = mockRes();

    await GameController.showGame(req, res);

    expect(cache.get).toHaveBeenCalledWith('highscore:u1:word_scramble');
    expect(gameScoresModel.getBestScore).not.toHaveBeenCalled();
    expect(res.render).toHaveBeenCalledWith(
      'games/wordScramble',
      expect.objectContaining({ highScore: fakeScore })
    );
  });

  it('queries DB on cache MISS and wraps result before caching', async () => {
    const fakeScore = { score: 300 };
    cache.get.mockResolvedValueOnce(null); // highscore cache MISS
    gameScoresModel.getBestScore.mockResolvedValue(fakeScore);
    const req = makeReq('flashMatch');
    const res = mockRes();

    await GameController.showGame(req, res);

    expect(gameScoresModel.getBestScore).toHaveBeenCalledWith('u1', 'flash_match');
    expect(cache.set).toHaveBeenCalledWith(
      'highscore:u1:flash_match',
      { v: fakeScore },
      CACHE_TTL.HIGH_SCORE
    );
    expect(res.render).toHaveBeenCalledWith(
      'games/flashMatch',
      expect.objectContaining({ highScore: fakeScore })
    );
  });

  it('correctly handles null high score (new player, never played)', async () => {
    cache.get.mockResolvedValueOnce(null); // highscore MISS
    gameScoresModel.getBestScore.mockResolvedValue(null);
    const req = makeReq('speedVocab');
    const res = mockRes();

    await GameController.showGame(req, res);

    expect(cache.set).toHaveBeenCalledWith(
      'highscore:u1:speed_vocab',
      { v: null },
      CACHE_TTL.HIGH_SCORE
    );
    expect(res.render).toHaveBeenCalledWith(
      'games/speedVocab',
      expect.objectContaining({ highScore: null })
    );
  });

  it('unwraps { v: null } from cache correctly (does not re-query DB)', async () => {
    cache.get.mockResolvedValueOnce({ v: null }); // cached wrapper with null inside
    const req = makeReq('vocabQuiz');
    const res = mockRes();

    await GameController.showGame(req, res);

    expect(gameScoresModel.getBestScore).not.toHaveBeenCalled();
    expect(res.render).toHaveBeenCalledWith(
      'games/vocabQuiz',
      expect.objectContaining({ highScore: null })
    );
  });
});

// ── Part B: Game controllers — N+1 fix ──────────────────────────
const SAMPLE_WORDS = [
  {
    id: 1,
    word: 'maison',
    language_code: 'fr',
    type: 'nom',
    meaning: 'house',
    example: 'La **maison** est grande.',
    pronunciation: 'mɛzɔ̃',
    synonyms: '',
    antonyms: '',
    grammar: '',
    level: '0',
    package_id: '42',
  },
  {
    id: 2,
    word: 'chat',
    language_code: 'fr',
    type: 'nom',
    meaning: 'cat',
    example: 'Le **chat** dort.',
    pronunciation: 'ʃa',
    synonyms: '',
    antonyms: '',
    grammar: '',
    level: '0',
    package_id: '42',
  },
];

describe('WordScrambleController — uses single JOIN query', () => {
  const controller = require('../../app/controllers/gameControllers/WordScrambleController');

  it('calls findWordsWithDetailsByLevel (NOT findWordsByLevel + findById)', async () => {
    learningModel.findWordsWithDetailsByLevel.mockResolvedValue(SAMPLE_WORDS);
    const req = { query: { package: '42' } };
    const res = mockRes();

    await controller.getRandomWordsForScramble(req, res);

    expect(learningModel.findWordsWithDetailsByLevel).toHaveBeenCalledWith('42', '0');
    expect(learningModel.findWordsByLevel).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      words: expect.arrayContaining([
        expect.objectContaining({ word: expect.any(String), scrambled: expect.any(String) }),
      ]),
    });
  });

  it('maps word data correctly: word, scrambled, meaning with type prefix', async () => {
    learningModel.findWordsWithDetailsByLevel.mockResolvedValue([SAMPLE_WORDS[0]]);
    const req = { query: { package: '42' } };
    const res = mockRes();

    await controller.getRandomWordsForScramble(req, res);

    const result = res.json.mock.calls[0][0].words[0];
    expect(result.word).toBe('maison');
    expect(result.meaning).toBe('nom : house');
    expect(result.scrambled).toBeDefined();
  });
});

describe('FlashMatchController — uses single JOIN query', () => {
  const controller = require('../../app/controllers/gameControllers/FlashMatchController');

  it('calls findWordsWithDetailsByLevel and returns cards with word IDs', async () => {
    learningModel.findWordsWithDetailsByLevel.mockResolvedValue(SAMPLE_WORDS);
    const fourWords = [
      ...SAMPLE_WORDS,
      { ...SAMPLE_WORDS[0], id: 3 },
      { ...SAMPLE_WORDS[1], id: 4 },
    ];
    learningModel.findWordsWithDetailsByLevel.mockResolvedValue(fourWords);

    const req = { session: { user: { id: 'u1' } }, query: { package: '42' } };
    const res = mockRes();

    await controller.getCardsForFlashMatch(req, res);

    expect(learningModel.findWordsWithDetailsByLevel).toHaveBeenCalledWith('42', 'x');
    expect(learningModel.findWordsByLevel).not.toHaveBeenCalled();
    const body = res.json.mock.calls[0][0];
    expect(body.cards).toBeDefined();
    expect(body.wordIds).toBeDefined();
    expect(body.cards.length).toBe(fourWords.length * 2);
  });
});

describe('SpeedVocabController — uses single JOIN query', () => {
  const controller = require('../../app/controllers/gameControllers/SpeedVocabController');

  it('calls findWordsWithDetailsByLevel and maps { word, meaning }', async () => {
    learningModel.findWordsWithDetailsByLevel.mockResolvedValue(SAMPLE_WORDS);
    const req = { query: { package: '42' } };
    const res = mockRes();

    await controller.getWordsForSpeedVocab(req, res);

    expect(learningModel.findWordsWithDetailsByLevel).toHaveBeenCalledWith('42', '1');
    const result = res.json.mock.calls[0][0].words;
    expect(result).toEqual([
      { word: 'maison', meaning: 'nom : house' },
      { word: 'chat', meaning: 'nom : cat' },
    ]);
  });
});

describe('VocabQuizController — uses single JOIN query', () => {
  const controller = require('../../app/controllers/gameControllers/VocabQuizController');

  it('calls findWordsWithDetailsByLevel for question generation', async () => {
    const sixWords = Array.from({ length: 6 }, (_, i) => ({
      ...SAMPLE_WORDS[0],
      id: i + 1,
      word: `word${i}`,
      meaning: `meaning${i}`,
    }));
    learningModel.findWordsWithDetailsByLevel.mockResolvedValue(sixWords);
    const req = { session: { user: { id: 'u1' } }, query: { package: '42' } };
    const res = mockRes();

    await controller.getQuestionForVocabQuiz(req, res);

    expect(learningModel.findWordsWithDetailsByLevel).toHaveBeenCalledWith('42', 'x');
    expect(learningModel.findWordsByLevel).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ questionWords: expect.any(Array) })
    );
  });
});

describe('PhraseCompletionController — uses single JOIN query', () => {
  const controller = require('../../app/controllers/gameControllers/PhraseCompletionController');

  it('calls findWordsWithDetailsByLevel and extracts phrases from examples', async () => {
    learningModel.findWordsWithDetailsByLevel.mockResolvedValue(SAMPLE_WORDS);
    const req = { session: { user: { id: 'u1' } }, query: { package: '42' } };
    const res = mockRes();

    await controller.getPhrasesForCompletion(req, res);

    expect(learningModel.findWordsWithDetailsByLevel).toHaveBeenCalledWith('42', '0');
    const phrases = res.json.mock.calls[0][0].phrases;
    expect(phrases.length).toBe(2);
    expect(phrases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          word: expect.any(String),
          meaningWord: expect.any(String),
          correctWords: expect.any(Array),
        }),
      ])
    );
  });
});

describe('TestPronunController — uses single JOIN query', () => {
  const controller = require('../../app/controllers/gameControllers/TestPronunController');

  it('calls findWordsWithDetailsByLevel and includes pronunciation + language_code', async () => {
    learningModel.findWordsWithDetailsByLevel.mockResolvedValue(SAMPLE_WORDS);
    const req = { query: { package: '42' } };
    const res = mockRes();

    await controller.getWordsForTestPronun(req, res);

    expect(learningModel.findWordsWithDetailsByLevel).toHaveBeenCalledWith('42', 'x');
    const result = res.json.mock.calls[0][0].words;
    expect(result[0]).toEqual({
      word: 'maison',
      meaning: 'nom : house',
      pronunciation: 'mɛzɔ̃',
      language_code: 'fr',
    });
  });
});
