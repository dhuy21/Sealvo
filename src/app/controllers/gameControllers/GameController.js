const gameScoresModel = require('../../models/game_scores');
const learningModel = require('../../models/learning');
const cache = require('../../core/cache');
const CACHE_TTL = require('../../config/cache');

class GameController {
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
      highScore = await gameScoresModel.getBestScore(req.session.user.id, dbGameType);
      await cache.set(hsKey, { v: highScore }, CACHE_TTL.HIGH_SCORE);
    } else {
      highScore = hsWrapper.v;
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

    if (WordCountlevel < minWordsRequired) {
      errorMessage = `Vous devez avoir au moins ${minWordsRequired} mots au niveau ${levelGame[gameType]} dans votre vocabulaire pour jouer à ce jeu.`;
    } else if (wordCount < minWordsRequired) {
      errorMessage = `Aujourd'hui, vous n'avez pas assez de mots à réviser au niveau ${levelGame[gameType]} pour jouer. Revenez quand vos mots seront prêts pour la révision.`;
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
      wordCount: wordCount,
      errorMessage: errorMessage,
      gameTitle: gameTitles[gameType],
      gameDescription: gameDescriptions[gameType],
    });
  }

  async saveScore(req, res) {
    const { game_type, score } = req.body;
    const userId = req.session.user.id;

    const isHighScore = await gameScoresModel.saveScore(userId, game_type, score);

    await cache.del(`highscore:${userId}:${game_type}`);

    return res.json({
      success: true,
      isHighScore,
    });
  }
}

module.exports = new GameController();
