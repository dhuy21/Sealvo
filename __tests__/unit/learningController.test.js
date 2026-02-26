/**
 * Unit tests: LearningController.checkAndUpdateStreak (mock userModel)
 */
const userModel = require('../../app/models/users');
const LearningController = require('../../app/controllers/LearningController');

jest.mock('../../app/models/users');

describe('LearningController (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAndUpdateStreak', () => {
    it('updates streak and returns 200 when streak_updated_at is null', async () => {
      userModel.getDateUpdatedStreak.mockResolvedValue(null);
      userModel.getStreakById.mockResolvedValue({ streak: 2 });
      userModel.updateStreak.mockResolvedValue(undefined);
      userModel.updateStreakUpdatedAt.mockResolvedValue(undefined);

      const req = { session: { user: { id: 1 } } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await LearningController.checkAndUpdateStreak(req, res);

      expect(userModel.getDateUpdatedStreak).toHaveBeenCalledWith(1);
      expect(userModel.getStreakById).toHaveBeenCalledWith(1);
      expect(userModel.updateStreak).toHaveBeenCalledWith(1, 3);
      expect(userModel.updateStreakUpdatedAt).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        updated: true,
        newStreak: 3,
        message: 'Série mise à jour avec succès!',
      });
    });

    it('returns updated: false and reason when already updated today', async () => {
      const today = new Date();
      userModel.getDateUpdatedStreak.mockResolvedValue({
        streak_updated_at: today.toISOString(),
      });
      userModel.getStreakById.mockResolvedValue({ streak: 5 });

      const req = { session: { user: { id: 1 } } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await LearningController.checkAndUpdateStreak(req, res);

      expect(userModel.updateStreak).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        updated: false,
        currentStreak: 5,
        reason: "Déjà mis à jour aujourd'hui",
      });
    });

    it('returns 500 when userModel throws', async () => {
      userModel.getDateUpdatedStreak.mockRejectedValue(new Error('DB error'));

      const req = { session: { user: { id: 1 } } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await LearningController.checkAndUpdateStreak(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        updated: false,
        message: expect.stringMatching(/erreur|streak/i),
      });
    });
  });
});
