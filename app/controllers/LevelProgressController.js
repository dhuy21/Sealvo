const learningModel = require('../models/learning');
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
    try {
      if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Vous devez être connecté' });
      }

      const { game_type, completed } = req.body;

      if (!game_type || completed === undefined) {
        return res.status(400).json({ success: false, message: 'Paramètres manquants' });
      }

      const gameLevel = {
        flash_match: 'x',
        vocab_quiz: 'x',
        word_scramble: '0',
        phrase_completion: '0',
        speed_vocab: '1',
        word_search: '2',
        test_pronunciation: 'x',
      };

      const levelGames = {
        x: ['flash_match', 'vocab_quiz', 'test_pronunciation'],
        0: ['word_scramble', 'phrase_completion'],
        1: ['speed_vocab'],
        2: ['word_search'],
      };

      const currentLevel = gameLevel[game_type];
      if (!currentLevel) {
        return res.status(400).json({
          success: false,
          message: 'Type de jeu non reconnu',
        });
      }

      if (completed) {
        const progress = await this.getUserLevelProgress(req.session.user.id);

        if (!progress[currentLevel]) {
          progress[currentLevel] = {};
        }
        progress[currentLevel][game_type] = true;

        await this.saveUserLevelProgress(req.session.user.id, progress);

        const requiredGames = levelGames[currentLevel];
        let allCompleted = true;

        for (const requiredGame of requiredGames) {
          if (!progress[currentLevel][requiredGame]) {
            allCompleted = false;
            break;
          }
        }

        if (allCompleted) {
          const package_id = req.query.package;
          const words = await learningModel.findWordsTodayByLevel(package_id, currentLevel);

          const updatedWords = [];
          for (const word of words) {
            await learningModel.updateLevelWord(package_id, word.detail_id, currentLevel);
            updatedWords.push(word.detail_id);
          }

          delete progress[currentLevel];
          await this.saveUserLevelProgress(req.session.user.id, progress);

          await cache.del([`dashboard:${req.session.user.id}`, `words:${package_id}`]);

          return res.json({
            success: true,
            level_completed: true,
            words_updated: updatedWords.length,
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
    } catch (error) {
      console.error('Erreur lors du suivi de la progression:', error);
      return res.status(500).json({
        success: false,
        message: 'Une erreur est survenue lors du suivi de la progression',
      });
    }
  }

  /**
   * Get current progress for all levels
   */
  async getLevelProgress(req, res) {
    try {
      if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Vous devez être connecté' });
      }

      const progress = await this.getUserLevelProgress(req.session.user.id);

      return res.json({
        success: true,
        progress,
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de la progression:', error);
      return res.status(500).json({
        success: false,
        message: 'Une erreur est survenue lors de la récupération de la progression',
      });
    }
  }

  /**
   * Reset progress for a specific level
   */
  async resetLevelProgress(req, res) {
    try {
      if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Vous devez être connecté' });
      }

      const { level } = req.body;

      if (!level) {
        return res.status(400).json({ success: false, message: 'Niveau manquant' });
      }

      const progress = await this.getUserLevelProgress(req.session.user.id);

      delete progress[level];

      await this.saveUserLevelProgress(req.session.user.id, progress);

      return res.json({
        success: true,
        message: `Progression pour le niveau ${level} réinitialisée`,
      });
    } catch (error) {
      console.error('Erreur lors de la réinitialisation de la progression:', error);
      return res.status(500).json({
        success: false,
        message: 'Une erreur est survenue lors de la réinitialisation de la progression',
      });
    }
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
