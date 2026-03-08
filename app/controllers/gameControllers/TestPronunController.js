const learningModel = require('../../models/learning');
const levelGame = 'x';

class TestPronunController {
  async getWordsForTestPronun(req, res) {
    try {
      const package_id = req.query.package;

      const rawWords = await learningModel.findWordsWithDetailsByLevel(package_id, levelGame);
      const words = rawWords.map((w) => ({
        word: w.word,
        meaning: w.type ? `${w.type} : ${w.meaning}` : w.meaning,
        pronunciation: w.pronunciation,
        language_code: w.language_code,
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

module.exports = new TestPronunController();
