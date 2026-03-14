const learningModel = require('../../models/learning');
const levelGame = '1';

class SpeedVocabController {
  constructor() {
    this.getWordsForSpeedVocab = this.getWordsForSpeedVocab.bind(this);
  }

  async getWordsForSpeedVocab(req, res) {
    const package_id = req.query.package;

    const rawWords = await learningModel.findWordsWithDetailsByLevel(package_id, levelGame);
    const words = rawWords.map((w) => ({
      word: w.word,
      meaning: w.type ? `${w.type} : ${w.meaning}` : w.meaning,
    }));

    return res.json({ words });
  }
}

module.exports = new SpeedVocabController();
