const userModel = require('../models/users');
const cache = require('../core/cache');

function toDateOnly(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

async function recordActivity(userId) {
  const [streakRow, dateRow] = await Promise.all([
    userModel.getStreakById(userId),
    userModel.getDateUpdatedStreak(userId),
  ]);

  const current = streakRow?.streak ? parseInt(streakRow.streak) : 0;
  const today = toDateOnly(new Date());

  if (dateRow?.streak_updated_at) {
    const last = toDateOnly(new Date(dateRow.streak_updated_at));
    const diffDays = Math.round((today - last) / (24 * 60 * 60 * 1000));

    if (diffDays === 0) return { updated: false, streak: current };

    const newStreak = diffDays === 1 ? current + 1 : 1;
    await userModel.updateStreak(userId, newStreak);
    await userModel.updateStreakUpdatedAt(userId);
    await cache.del(`dashboard:${userId}`);
    return { updated: true, streak: newStreak };
  }

  await userModel.updateStreak(userId, 1);
  await userModel.updateStreakUpdatedAt(userId);
  await cache.del(`dashboard:${userId}`);
  return { updated: true, streak: 1 };
}

module.exports = { recordActivity };
