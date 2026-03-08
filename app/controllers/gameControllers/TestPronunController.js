const wordModel = require('../../models/words');
const learningModel = require('../../models/learning');
const levelGame = 'x';

class TestPronunController {
  async getWordsForTestPronun(req, res) {
    try {
      const package_id = req.query.package;

      const detailWordsIds = await learningModel.findWordsByLevel(package_id, levelGame);
      let words = [];
      for (const detailWordId of detailWordsIds) {
        let word = await wordModel.findById(detailWordId.detail_id);

        let meaning = '';
        if (word.type) {
          meaning += `${word.type} : `;
        }
        meaning += word.meaning;

        words.push({
          word: word.word,
          meaning: meaning,
          pronunciation: word.pronunciation,
          language_code: word.language_code,
        });
      }

      return res.json({
        words: words,
      });
    } catch (error) {
      console.error("Erreur lors de la récupération d'un mot aléatoire:", error);
      return res
        .status(500)
        .json({ error: "Une erreur est survenue lors de la récupération d'un mot." });
    }
  }
}

module.exports = new TestPronunController();
