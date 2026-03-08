const userModel = require('../models/users');
const cache = require('../core/cache');

class LearningController {
  async checkAndUpdateStreak(req, res) {
    if (!req.session.user) {
      return res.status(401).json({
        updated: false,
        message: 'Vous devez être connecté',
      });
    }
    const user_id = req.session.user.id;
    if (user_id) {
      try {
        const streak_updated_at = await userModel.getDateUpdatedStreak(user_id);
        if (!streak_updated_at || !streak_updated_at.streak_updated_at) {
          const streakData = await userModel.getStreakById(user_id);
          let currentStreak = streakData && streakData.streak ? parseInt(streakData.streak) : 0;
          currentStreak += 1; // Incrémente la série
          await userModel.updateStreak(user_id, currentStreak);

          await userModel.updateStreakUpdatedAt(user_id);

          // Invalidate dashboard cache to reflect the new streak immediately
          await cache.del(`dashboard:${user_id}`);

          res.status(200).json({
            updated: true,
            newStreak: currentStreak,
            message: 'Série mise à jour avec succès!',
          });
        } else {
          const now = new Date();
          const streakUpdatedAt = new Date(streak_updated_at.streak_updated_at);

          // Formater les dates pour comparer seulement les jours (pas l'heure)
          const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const streakUpdatedAtDate = new Date(
            streakUpdatedAt.getFullYear(),
            streakUpdatedAt.getMonth(),
            streakUpdatedAt.getDate()
          );

          if (nowDate.getTime() !== streakUpdatedAtDate.getTime()) {
            const streakData = await userModel.getStreakById(user_id);
            let currentStreak = streakData && streakData.streak ? parseInt(streakData.streak) : 0;
            currentStreak += 1; // Incrémente la série
            await userModel.updateStreak(user_id, currentStreak);

            await userModel.updateStreakUpdatedAt(user_id);

            // Invalidate dashboard cache to reflect the new streak immediately
            await cache.del(`dashboard:${user_id}`);

            res.status(200).json({
              updated: true,
              newStreak: currentStreak,
              message: 'Série mise à jour avec succès!',
            });
          } else {
            const streakData = await userModel.getStreakById(user_id);
            let currentStreak = streakData && streakData.streak ? parseInt(streakData.streak) : 0;

            res.status(200).json({
              updated: false,
              currentStreak: currentStreak,
              reason: "Déjà mis à jour aujourd'hui",
            });
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification/mise à jour du streak:', error);
        res.status(500).json({
          updated: false,
          message: 'Une erreur est survenue lors de la vérification/mise à jour du streak',
        });
      }
    }
  }
}

module.exports = new LearningController();
