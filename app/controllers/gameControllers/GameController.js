const gameScoresModel = require('../../models/game_scores');
const learningModel = require('../../models/learning');
const cache = require('../../core/cache');
const CACHE_TTL = require('../../config/cache');

class GameController {
  async index(req, res) {
    const userId = req.session.user.id;
    let stats = await cache.get(`gamestats:${userId}`);
    if (!stats) {
      stats = await gameScoresModel.getUserGameStats(userId);
      await cache.set(`gamestats:${userId}`, stats, CACHE_TTL.GAME_STATS);
    }
    return res.render('games/index', {
      title: 'Jeux éducatifs',
      user: req.session.user,
      stats: stats,
      package_id: req.query.package,
    });
  }

  async showGame(req, res) {
    const package_id = req.query.package;
    const gameType = req.params.gameType;

    const dbGameType = gameType
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');

    const hsKey = `highscore:${req.session.user.id}:${dbGameType}`;
    let hsWrapper = await cache.get(hsKey);
    let highScore;
    if (hsWrapper === null) {
      highScore = await gameScoresModel.getHighScore(req.session.user.id, dbGameType);
      await cache.set(hsKey, { v: highScore }, CACHE_TTL.HIGH_SCORE);
    } else {
      highScore = hsWrapper.v;
    }

    let leaderboard = await cache.get(`lb:${dbGameType}`);
    if (!leaderboard) {
      leaderboard = await gameScoresModel.getLeaderboard(dbGameType, 5);
      await cache.set(`lb:${dbGameType}`, leaderboard, CACHE_TTL.LEADERBOARD);
    }

    const levelGame = {
      flashMatch: 'x',
      vocabQuiz: 'x',
      testPronun: 'x',
      wordSearch: '2',
      phraseCompletion: '0',
      speedVocab: '1',
      wordScramble: '0',
    };

    let wordCount = 0;
    let WordCountlevel = 0;

    try {
      wordCount = await learningModel.countUserWordsByLevel(package_id, levelGame[gameType]);
      WordCountlevel = await learningModel.getNumWordsByLevel(package_id, levelGame[gameType]);
    } catch (countError) {
      console.error('Error counting user words:', countError);
    }

    let minWordsRequired = 5;
    if (gameType === 'flashMatch') minWordsRequired = 6;

    let errorMessage = null;

    if (wordCount < minWordsRequired || WordCountlevel == 0) {
      errorMessage = `Vous devez avoir au moins ${minWordsRequired} mots au niveau ${levelGame[gameType]} dans votre vocabulaire pour jouer à ce jeu.`;
    } else if (WordCountlevel !== 0 && wordCount == 0) {
      errorMessage = `Aujourd'hui, vous n'avez pas de mots à apprendre pour niveau ${levelGame[gameType]}. Si vous voulez jouer à ce jeu, veuillez ajouter des mots à votre vocabulaire.`;
    }

    const gameTitles = {
      wordScramble: 'Mots Mélangés',
      flashMatch: 'Memory Match',
      speedVocab: 'Vitesse Vocab',
      vocabQuiz: 'Quiz de Vocabulaire',
      phraseCompletion: 'Complétion de Phrase',
      wordSearch: 'Mots Cachés',
      testPronun: 'Défi Prononcial',
    };

    const gameDescriptions = {
      wordScramble: 'Retrouvez les mots dont les lettres ont été mélangées.',
      flashMatch: 'Associez les mots à leurs définitions.',
      speedVocab: "Tapez les mots qui s'affichent le plus rapidement possible.",
      vocabQuiz: 'Testez vos connaissances avec ce quiz de vocabulaire.',
      phraseCompletion: 'Complétez les phrases avec les mots appropriés.',
      wordSearch: 'Trouvez les mots cachés dans la grille.',
      testPronun: 'Essayez de prononcer les mots correctement.',
    };

    return res.render(`games/${gameType}`, {
      title: `${gameTitles[gameType]}`,
      package_id: package_id,
      user: req.session.user,
      highScore: highScore,
      leaderboard: leaderboard,
      wordCount: wordCount,
      errorMessage: errorMessage,
      gameTitle: gameTitles[gameType],
      gameDescription: gameDescriptions[gameType],
    });
  }

  async saveScore(req, res) {
    const { game_type, score, details } = req.body;

    const userId = req.session.user.id;
    const scoreId = await gameScoresModel.saveScore(userId, game_type, score, details || {});

    await cache.del([`gamestats:${userId}`, `lb:${game_type}`, `highscore:${userId}:${game_type}`]);

    const stats = await gameScoresModel.getUserGameStats(userId);
    await cache.set(`gamestats:${userId}`, stats, CACHE_TTL.GAME_STATS);

    return res.json({
      success: true,
      score_id: scoreId,
      stats: stats[game_type],
    });
  }
}

module.exports = new GameController();
