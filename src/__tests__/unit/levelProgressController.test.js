/**
 * Unit tests: LevelProgressController.trackGameCompletion (validation)
 *
 * Auth is handled by the isAuthenticatedAPI middleware, not the controller.
 * These tests focus on the validation logic that throws ValidationError.
 */
const LevelProgressController = require('../../app/controllers/LevelProgressController');
const { ValidationError } = require('../../app/errors/AppError');

jest.mock('../../app/models/learning');
jest.mock('../../app/core/cache', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(true),
}));

describe('LevelProgressController (unit)', () => {
  describe('trackGameCompletion', () => {
    it('throws ValidationError when game_type is missing', async () => {
      const req = {
        session: { user: { id: 1 } },
        body: { completed: true },
        query: {},
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await expect(LevelProgressController.trackGameCompletion(req, res)).rejects.toThrow(
        ValidationError
      );
    });

    it('throws ValidationError when completed is undefined', async () => {
      const req = {
        session: { user: { id: 1 } },
        body: { game_type: 'vocab_quiz' },
        query: {},
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await expect(LevelProgressController.trackGameCompletion(req, res)).rejects.toThrow(
        ValidationError
      );
    });

    it('throws ValidationError when game_type is not recognized', async () => {
      const req = {
        session: { user: { id: 1 } },
        body: { game_type: 'unknown_game', completed: true },
        query: {},
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await expect(LevelProgressController.trackGameCompletion(req, res)).rejects.toThrow(
        ValidationError
      );
    });
  });
});
