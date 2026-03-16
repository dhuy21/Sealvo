const streakService = require('../services/streakService');
const { UnauthorizedError } = require('../errors/AppError');

class LearningController {
  async checkAndUpdateStreak(req, res) {
    if (!req.session.user) throw new UnauthorizedError('Vous devez être connecté');

    const result = await streakService.recordActivity(req.session.user.id);
    res.status(200).json({
      updated: result.updated,
      newStreak: result.streak,
      ...(result.updated
        ? { message: 'Série mise à jour avec succès!' }
        : { reason: "Déjà mis à jour aujourd'hui" }),
    });
  }
}

module.exports = new LearningController();
