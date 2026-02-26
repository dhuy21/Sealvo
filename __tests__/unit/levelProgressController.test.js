/**
 * Unit tests: LevelProgressController.trackGameCompletion (validation + auth)
 */
const LevelProgressController = require('../../app/controllers/LevelProgressController');

jest.mock('../../app/models/learning');

describe('LevelProgressController (unit)', () => {
  describe('trackGameCompletion', () => {
    it('returns 401 when user is not authenticated', async () => {
      const req = { session: {}, body: {}, query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await LevelProgressController.trackGameCompletion(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Vous devez être connecté',
      });
    });

    it('returns 400 when game_type is missing', async () => {
      const req = {
        session: { user: { id: 1 } },
        body: { completed: true },
        query: {},
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await LevelProgressController.trackGameCompletion(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Paramètres manquants',
      });
    });

    it('returns 400 when completed is undefined', async () => {
      const req = {
        session: { user: { id: 1 } },
        body: { game_type: 'vocab_quiz' },
        query: {},
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await LevelProgressController.trackGameCompletion(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Paramètres manquants',
      });
    });

    it('returns 400 when game_type is not recognized', async () => {
      const req = {
        session: { user: { id: 1 } },
        body: { game_type: 'unknown_game', completed: true },
        query: {},
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await LevelProgressController.trackGameCompletion(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Type de jeu non reconnu',
      });
    });
  });
});
