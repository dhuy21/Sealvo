const learningModel = require('../../models/learning');
const { NotFoundError } = require('../../errors/AppError');
const levelGame = '2';

class WordSearchController {
  constructor() {
    this.getWordsForGame = this.getWordsForGame.bind(this);
  }

  async getWordsForGame(req, res) {
    const wordCount = 30;
    const gridSize = 15;
    const package_id = req.query.package;
    const words = await learningModel.getRandomUserWords(package_id, wordCount, levelGame);

    if (!words || words.length === 0) {
      throw new NotFoundError('Aucun mot trouvé dans votre vocabulaire.');
    }

    const wordList = words.map((word) => ({
      id: word.word_id,
      detail_id: word.detail_id,
      word: word.word,
      meaning: word.meaning,
    }));

    return res.json({ words: wordList, gridSize });
  }
}

module.exports = new WordSearchController();
