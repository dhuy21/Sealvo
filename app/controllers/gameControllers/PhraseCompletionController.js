const learningModel = require('../../models/learning');
const levelGame = '0';

class PhraseCompletionController {
  constructor() {
    this.getPhrasesForCompletion = this.getPhrasesForCompletion.bind(this);
    this.getAvailableWordsCount = this.getAvailableWordsCount.bind(this);
  }

  async getAvailableWordsCount(req, res) {
    const package_id = req.query.package;
    const wordCount = await learningModel.countUserWordsByLevel(package_id, levelGame);

    return res.json({ success: true, count: wordCount });
  }

  async getPhrasesForCompletion(req, res) {
    const package_id = req.query.package;

    const words = await learningModel.findWordsWithDetailsByLevel(package_id, levelGame);

    let phrases = [];

    for (const word of words) {
      let phrase = '';
      let correctWords = [];

      if (word.example && word.example.trim() !== '') {
        phrase = word.example;

        if (phrase.length > 0) {
          const regex = /\*\*([^*]+)\*\*/g;
          correctWords = [...phrase.matchAll(regex)].map((m) => m[1]);
          phrase = phrase.replace(regex, '_____');
        }
      }
      phrases.push({
        phrase: phrase,
        word: word.word,
        meaningWord: word.meaning,
        correctWords: correctWords,
      });
    }
    phrases = this.shuffleArray(phrases);

    return res.json({ phrases });
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

module.exports = new PhraseCompletionController();
