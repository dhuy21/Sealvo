const learningModel = require('../../models/learning');
const levelGame = '1';

class SpeedVocabController {
  constructor() {
    this.getWordsForSpeedVocab = this.getWordsForSpeedVocab.bind(this);
  }

  async getWordsForSpeedVocab(req, res) {
    try {
      const package_id = req.query.package;

      const rawWords = await learningModel.findWordsWithDetailsByLevel(package_id, levelGame);
      const words = rawWords.map((w) => ({
        word: w.word,
        meaning: w.type ? `${w.type} : ${w.meaning}` : w.meaning,
      }));

      return res.json({ words });
    } catch (error) {
      console.error("Erreur lors de la récupération d'un mot aléatoire:", error);
      return res
        .status(500)
        .json({ error: "Une erreur est survenue lors de la récupération d'un mot." });
    }
  }
}

module.exports = new SpeedVocabController();
