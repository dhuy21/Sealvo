const streakService = require('../services/streakService');

class LearningController {
  async checkAndUpdateStreak(req, res) {
    if (!req.session.user) {
      return res.status(401).json({ updated: false, message: 'Vous devez être connecté' });
    }

    try {
      const result = await streakService.recordActivity(req.session.user.id);
      res.status(200).json({
        updated: result.updated,
        newStreak: result.streak,
        ...(result.updated
          ? { message: 'Série mise à jour avec succès!' }
          : { reason: "Déjà mis à jour aujourd'hui" }),
      });
    } catch (error) {
      console.error('Erreur streak:', error);
      res
        .status(500)
        .json({ updated: false, message: 'Erreur lors de la mise à jour de la série' });
    }
  }
}

module.exports = new LearningController();
