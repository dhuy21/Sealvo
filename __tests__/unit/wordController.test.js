/**
 * Unit tests: WordController
 * Covers: deleteWord, editWordPost, deleteAllWords — authorization, validation, success, error paths.
 */
const wordModel = require('../../app/models/words');
const geminiService = require('../../app/services/gemini');
const WordController = require('../../app/controllers/WordController');

jest.mock('../../app/models/words');
jest.mock('../../app/models/learning');
jest.mock('../../app/services/gemini');
jest.mock('../../app/core/cache', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(true),
  invalidatePattern: jest.fn().mockResolvedValue(true),
}));

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  redirect: jest.fn(),
  render: jest.fn(),
});

describe('WordController (unit)', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── deleteWord ──────────────────────────────────────────────
  describe('deleteWord', () => {
    it('returns 401 when not authenticated', async () => {
      const req = { params: { id: '1' }, query: { package: '1' }, session: {} };
      const res = mockRes();

      await WordController.deleteWord(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('returns 404 when word is not found', async () => {
      wordModel.findUsersByWordId.mockResolvedValue(null);
      const req = {
        params: { id: '99' },
        query: { package: '1' },
        session: { user: { id: 'u1' } },
      };
      const res = mockRes();

      await WordController.deleteWord(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('returns 403 when word does not belong to the given package', async () => {
      wordModel.findUsersByWordId.mockResolvedValue({ package_id: 2 });
      const req = {
        params: { id: '1' },
        query: { package: '99' },
        session: { user: { id: 'u1' } },
      };
      const res = mockRes();

      await WordController.deleteWord(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('deletes word and returns success when authorized', async () => {
      wordModel.findUsersByWordId.mockResolvedValue({ package_id: '1' });
      wordModel.deleteWord.mockResolvedValue(undefined);
      const req = { params: { id: '1' }, query: { package: '1' }, session: { user: { id: 'u1' } } };
      const res = mockRes();

      await WordController.deleteWord(req, res);

      expect(wordModel.deleteWord).toHaveBeenCalledWith('1', '1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 500 when DB throws an error', async () => {
      wordModel.findUsersByWordId.mockRejectedValue(new Error('DB error'));
      const req = { params: { id: '1' }, query: { package: '1' }, session: { user: { id: 'u1' } } };
      const res = mockRes();

      await WordController.deleteWord(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });

  // ── editWordPost ────────────────────────────────────────────
  describe('editWordPost', () => {
    it('redirects to /login when not authenticated', async () => {
      const req = { session: {}, params: { id: '1' }, query: { package: '1' }, body: {} };
      const res = mockRes();

      await WordController.editWordPost(req, res);

      expect(res.redirect).toHaveBeenCalledWith('/login');
    });

    it('returns 404 when word is not found', async () => {
      wordModel.findById.mockResolvedValue(null);
      const req = {
        session: { user: { id: 1 } },
        params: { id: '99' },
        query: { package: '1' },
        body: { word: 'test', language_code: 'fr', type: 'nom', meaning: 'test', example: 'ex' },
      };
      const res = mockRes();

      await WordController.editWordPost(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('returns 403 when word belongs to a different package', async () => {
      wordModel.findById.mockResolvedValue({ package_id: '999' });
      const req = {
        session: { user: { id: 1 } },
        params: { id: '1' },
        query: { package: '1' },
        body: { word: 'test', language_code: 'fr', type: 'nom', meaning: 'test', example: 'ex' },
      };
      const res = mockRes();

      await WordController.editWordPost(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('returns 403 when required fields are missing', async () => {
      wordModel.findById.mockResolvedValue({ package_id: '1' });
      const req = {
        session: { user: { id: 1 } },
        params: { id: '1' },
        query: { package: '1' },
        body: { word: 'test' }, // missing language_code, type, meaning, example
      };
      const res = mockRes();

      await WordController.editWordPost(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/champs obligatoires/i),
        })
      );
    });

    it('updates word and returns success with valid data', async () => {
      wordModel.findById.mockResolvedValue({ package_id: '1' });
      wordModel.updateWord.mockResolvedValue(undefined);
      geminiService.modifyExample.mockResolvedValue([]);

      const req = {
        session: { user: { id: 1 } },
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
      };
      const res = mockRes();

      await WordController.editWordPost(req, res);

      expect(wordModel.updateWord).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ── deleteAllWords ──────────────────────────────────────────
  describe('deleteAllWords', () => {
    it('redirects to /login when not authenticated', async () => {
      const req = { session: {}, query: { package: '1' } };
      const res = mockRes();

      await WordController.deleteAllWords(req, res);

      expect(res.redirect).toHaveBeenCalledWith('/login');
    });

    it('returns 200 with success when words are deleted', async () => {
      wordModel.deleteAllWords.mockResolvedValue(5);
      const req = { session: { user: { id: 1 } }, query: { package: '1' } };
      const res = mockRes();

      await WordController.deleteAllWords(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 200 with "aucun mot" when no words exist', async () => {
      wordModel.deleteAllWords.mockResolvedValue(0);
      const req = { session: { user: { id: 1 } }, query: { package: '1' } };
      const res = mockRes();

      await WordController.deleteAllWords(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringMatching(/aucun/i),
        })
      );
    });

    it('returns 500 when DB throws an error', async () => {
      wordModel.deleteAllWords.mockRejectedValue(new Error('DB error'));
      const req = { session: { user: { id: 1 } }, query: { package: '1' } };
      const res = mockRes();

      await WordController.deleteAllWords(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });
});
