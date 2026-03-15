const learningModel = require('../models/learning');
const { ValidationError } = require('../errors/AppError');
const cache = require('../core/cache');
const CACHE_TTL = require('../config/cache');

class LevelProgressController {
  constructor() {
    this.trackGameCompletion = this.trackGameCompletion.bind(this);
    this.getLevelProgress = this.getLevelProgress.bind(this);
    this.resetLevelProgress = this.resetLevelProgress.bind(this);
  }

  /**
   * Track game completion for a specific level
   */
  async trackGameCompletion(req, res) {
    const { game_type, completed } = req.body;

    if (!game_type || completed === undefined) {
      throw new ValidationError('Paramètres manquants');
    }

    const gameLevel = {
      flash_match: 'x',
      vocab_quiz: 'x',
      word_scramble: '0',
      phrase_completion: '0',
      speed_vocab: '1',
      word_search: '2',
      test_pronun: 'x',
    };

    const levelGames = {
      x: ['flash_match', 'vocab_quiz', 'test_pronun'],
      0: ['word_scramble', 'phrase_completion'],
      1: ['speed_vocab'],
      2: ['word_search'],
    };

    const currentLevel = gameLevel[game_type];
    if (!currentLevel) throw new ValidationError('Type de jeu non reconnu');

    if (completed) {
      const progress = await this.getUserLevelProgress(req.session.user.id);

      if (!progress[currentLevel]) {
        progress[currentLevel] = {};
      }
      progress[currentLevel][game_type] = true;

      await this.saveUserLevelProgress(req.session.user.id, progress);

      const requiredGames = levelGames[currentLevel];
      const allCompleted = requiredGames.every((g) => progress[currentLevel][g]);

      if (allCompleted) {
        const package_id = req.query.package;
        const words = await learningModel.findWordsTodayByLevel(package_id, currentLevel);
        const detailIds = words.map((w) => w.detail_id);

        let updatedCount = 0;
        if (detailIds.length > 0) {
          updatedCount = await learningModel.batchUpdateLevel(package_id, detailIds, currentLevel);
        }

        delete progress[currentLevel];
        await this.saveUserLevelProgress(req.session.user.id, progress);

        await cache.del([`dashboard:${req.session.user.id}`, `words:${package_id}`]);

        return res.json({
          success: true,
          level_completed: true,
          words_updated: updatedCount,
          from_level: currentLevel,
          to_level: this.getNextLevel(currentLevel),
        });
      }

      return res.json({
        success: true,
        level_completed: false,
        game_tracked: game_type,
        missing_games: requiredGames.filter((g) => !progress[currentLevel][g]),
        message: 'Progression enregistrée, mais tous les jeux requis ne sont pas encore terminés',
      });
    }

    return res.json({
      success: true,
      message: 'Jeu non terminé avec succès, progression inchangée',
    });
  }

  async getLevelProgress(req, res) {
    const progress = await this.getUserLevelProgress(req.session.user.id);
    return res.json({ success: true, progress });
  }

  async resetLevelProgress(req, res) {
    const { level } = req.body;
    if (!level) throw new ValidationError('Niveau manquant');

    const progress = await this.getUserLevelProgress(req.session.user.id);
    delete progress[level];
    await this.saveUserLevelProgress(req.session.user.id, progress);

    return res.json({
      success: true,
      message: `Progression pour le niveau ${level} réinitialisée`,
    });
  }

  async getUserLevelProgress(userId) {
    const cached = await cache.get(`lvlprog:${userId}`);
    return cached || {};
  }

  async saveUserLevelProgress(userId, progress) {
    await cache.set(`lvlprog:${userId}`, progress, CACHE_TTL.SESSION);
  }

  /**
   * Helper method to get the next level
   */
  getNextLevel(currentLevel) {
    const levelProgression = {
      x: '0',
      0: '1',
      1: '2',
      2: 'v',
    };

    return levelProgression[currentLevel] || currentLevel;
  }
}

module.exports = new LevelProgressController();
