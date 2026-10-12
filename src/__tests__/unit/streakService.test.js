const userModel = require('../../app/models/users');
const cache = require('../../app/core/cache');
const streakService = require('../../app/services/streakService');

jest.mock('../../app/models/users');
jest.mock('../../app/core/cache');

describe('streakService (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cache.del.mockResolvedValue(undefined);
    userModel.updateStreak.mockResolvedValue(true);
    userModel.updateStreakUpdatedAt.mockResolvedValue(true);
  });

  it('sets streak to 1 on first ever activity (streak_updated_at null)', async () => {
    userModel.getStreakById.mockResolvedValue({ streak: 0 });
    userModel.getDateUpdatedStreak.mockResolvedValue(null);

    const result = await streakService.recordActivity('u1');

    expect(result).toEqual({ updated: true, streak: 1 });
    expect(userModel.updateStreak).toHaveBeenCalledWith('u1', 1);
    expect(userModel.updateStreakUpdatedAt).toHaveBeenCalledWith('u1');
    expect(cache.del).toHaveBeenCalledWith('dashboard:u1');
  });

  it('increments streak when last activity was yesterday', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    userModel.getStreakById.mockResolvedValue({ streak: 4 });
    userModel.getDateUpdatedStreak.mockResolvedValue({
      streak_updated_at: yesterday.toISOString(),
    });

    const result = await streakService.recordActivity('u1');

    expect(result).toEqual({ updated: true, streak: 5 });
    expect(userModel.updateStreak).toHaveBeenCalledWith('u1', 5);
  });

  it('resets streak to 1 when more than 1 day missed', async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    userModel.getStreakById.mockResolvedValue({ streak: 10 });
    userModel.getDateUpdatedStreak.mockResolvedValue({
      streak_updated_at: threeDaysAgo.toISOString(),
    });

    const result = await streakService.recordActivity('u1');

    expect(result).toEqual({ updated: true, streak: 1 });
    expect(userModel.updateStreak).toHaveBeenCalledWith('u1', 1);
  });

  it('returns updated: false when already recorded today', async () => {
    const now = new Date();

    userModel.getStreakById.mockResolvedValue({ streak: 7 });
    userModel.getDateUpdatedStreak.mockResolvedValue({ streak_updated_at: now.toISOString() });

    const result = await streakService.recordActivity('u1');

    expect(result).toEqual({ updated: false, streak: 7 });
    expect(userModel.updateStreak).not.toHaveBeenCalled();
    expect(cache.del).not.toHaveBeenCalled();
  });
});
