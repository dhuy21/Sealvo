/**
 * Unit tests: WordController.monVocabs & learnVocabs — cache-aside behavior.
 *
 * Verifies:
 *   - Cache HIT: data served from Redis, DB not queried
 *   - Cache MISS: data fetched from DB, then stored in cache with correct TTL
 *   - Both endpoints share the same cache key `words:<package_id>`
 */
const cache = require('../../app/core/cache');
const wordModel = require('../../app/models/words');
const learningModel = require('../../app/models/learning');
const CACHE_TTL = require('../../app/config/cache');

jest.mock('../../app/core/cache', () => ({
  get: jest.fn(),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(true),
  invalidatePattern: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../app/models/words');
jest.mock('../../app/models/learning');
jest.mock('../../app/services/gemini');

const WordController = require('../../app/controllers/WordController');

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  redirect: jest.fn(),
  render: jest.fn(),
});

const FAKE_WORDS = [
  {
    detail_id: 1,
    word: 'maison',
    meaning: 'house',
    type: 'nom',
    level: '0',
    example: '**La** maison',
  },
  {
    detail_id: 2,
    word: 'chat',
    meaning: 'cat',
    type: 'nom',
    level: '1',
    example: 'Le chat dort',
  },
];

beforeEach(() => jest.clearAllMocks());

// ── monVocabs ───────────────────────────────────────────────────
describe('WordController.monVocabs — cache-aside', () => {
  const makeReq = (pkg = '42') => ({
    session: { user: { id: 'u1' } },
    query: { package: pkg },
  });

  it('serves from cache on HIT and does NOT query the database', async () => {
    cache.get.mockResolvedValue(FAKE_WORDS);
    const req = makeReq();
    const res = mockRes();

    await WordController.monVocabs(req, res);

    expect(cache.get).toHaveBeenCalledWith('words:42');
    expect(wordModel.findWordsByPackageId).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
    expect(res.render).toHaveBeenCalledWith(
      'monVocabs',
      expect.objectContaining({ words: FAKE_WORDS, hasWords: true })
    );
  });

  it('fetches from DB on cache MISS and stores result with correct TTL', async () => {
    cache.get.mockResolvedValue(null);
    wordModel.findWordsByPackageId.mockResolvedValue(FAKE_WORDS);
    const req = makeReq('99');
    const res = mockRes();

    await WordController.monVocabs(req, res);

    expect(cache.get).toHaveBeenCalledWith('words:99');
    expect(wordModel.findWordsByPackageId).toHaveBeenCalledWith('99');
    expect(cache.set).toHaveBeenCalledWith('words:99', FAKE_WORDS, CACHE_TTL.WORDS);
    expect(res.render).toHaveBeenCalledWith(
      'monVocabs',
      expect.objectContaining({ hasWords: true })
    );
  });

  it('renders correctly with empty word list', async () => {
    cache.get.mockResolvedValue(null);
    wordModel.findWordsByPackageId.mockResolvedValue([]);
    const req = makeReq();
    const res = mockRes();

    await WordController.monVocabs(req, res);

    expect(res.render).toHaveBeenCalledWith(
      'monVocabs',
      expect.objectContaining({ hasWords: false, words: [] })
    );
  });

  it('redirects to /login when not authenticated', async () => {
    const req = { session: {}, query: { package: '1' } };
    const res = mockRes();

    await WordController.monVocabs(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/login');
    expect(cache.get).not.toHaveBeenCalled();
  });
});

// ── learnVocabs ─────────────────────────────────────────────────
describe('WordController.learnVocabs — cache-aside', () => {
  const makeReq = (pkg = '42') => ({
    session: { user: { id: 'u1' } },
    query: { package: pkg },
  });

  it('serves words from cache on HIT and does NOT query the database', async () => {
    cache.get.mockResolvedValue(FAKE_WORDS);
    learningModel.findWordsTodayToLearn.mockResolvedValue([{ detail_id: 1 }]);
    const req = makeReq();
    const res = mockRes();

    await WordController.learnVocabs(req, res);

    expect(cache.get).toHaveBeenCalledWith('words:42');
    expect(wordModel.findWordsByPackageId).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
    expect(res.render).toHaveBeenCalledWith(
      'learnVocabs',
      expect.objectContaining({ words: expect.any(Array), package_id: '42' })
    );
  });

  it('fetches from DB on cache MISS and stores result with correct TTL', async () => {
    cache.get.mockResolvedValue(null);
    wordModel.findWordsByPackageId.mockResolvedValue(FAKE_WORDS);
    learningModel.findWordsTodayToLearn.mockResolvedValue([]);
    const req = makeReq('77');
    const res = mockRes();

    await WordController.learnVocabs(req, res);

    expect(wordModel.findWordsByPackageId).toHaveBeenCalledWith('77');
    expect(cache.set).toHaveBeenCalledWith('words:77', FAKE_WORDS, CACHE_TTL.WORDS);
  });

  it('correctly merges dueToday flag from learning model', async () => {
    cache.get.mockResolvedValue([
      { detail_id: 10, word: 'a', meaning: 'b', example: 'c', level: '0' },
      { detail_id: 20, word: 'd', meaning: 'e', example: 'f', level: '1' },
    ]);
    learningModel.findWordsTodayToLearn.mockResolvedValue([{ detail_id: 10 }]);
    const req = makeReq();
    const res = mockRes();

    await WordController.learnVocabs(req, res);

    const renderedWords = res.render.mock.calls[0][1].words;
    expect(renderedWords[0].dueToday).toBe(true);
    expect(renderedWords[1].dueToday).toBe(false);
  });

  it('redirects to /login when not authenticated', async () => {
    const req = { session: {}, query: { package: '1' } };
    const res = mockRes();

    await WordController.learnVocabs(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/login');
    expect(cache.get).not.toHaveBeenCalled();
  });
});
