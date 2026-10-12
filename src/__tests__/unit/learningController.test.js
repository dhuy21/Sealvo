/**
 * Unit tests: LearningController.checkAndUpdateStreak (mock streakService)
 */
const streakService = require('../../app/services/streakService');
const LearningController = require('../../app/controllers/LearningController');
const { UnauthorizedError } = require('../../app/errors/AppError');

jest.mock('../../app/services/streakService');

describe('LearningController (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAndUpdateStreak', () => {
    it('returns updated: true with new streak when service updates', async () => {
      streakService.recordActivity.mockResolvedValue({ updated: true, streak: 3 });

      const req = { session: { user: { id: 1 } } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await LearningController.checkAndUpdateStreak(req, res);

      expect(streakService.recordActivity).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        updated: true,
        newStreak: 3,
        message: 'Série mise à jour avec succès!',
      });
    });

    it('returns updated: false with reason when already counted today', async () => {
      streakService.recordActivity.mockResolvedValue({ updated: false, streak: 5 });

      const req = { session: { user: { id: 1 } } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await LearningController.checkAndUpdateStreak(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        updated: false,
        newStreak: 5,
        reason: "Déjà mis à jour aujourd'hui",
      });
    });

    it('throws UnauthorizedError when user is not authenticated', async () => {
      const req = { session: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await expect(LearningController.checkAndUpdateStreak(req, res)).rejects.toThrow(
        UnauthorizedError
      );
      expect(streakService.recordActivity).not.toHaveBeenCalled();
    });

    it('propagates service error as unhandled rejection', async () => {
      streakService.recordActivity.mockRejectedValue(new Error('DB error'));

      const req = { session: { user: { id: 1 } } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await expect(LearningController.checkAndUpdateStreak(req, res)).rejects.toThrow('DB error');
    });
  });
});
