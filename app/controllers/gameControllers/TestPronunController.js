const learningModel = require('../../models/learning');
const levelGame = 'x';

class TestPronunController {
  async getWordsForTestPronun(req, res) {
    const package_id = req.query.package;

    const rawWords = await learningModel.findWordsWithDetailsByLevel(package_id, levelGame);
    const words = rawWords.map((w) => ({
      word: w.word,
      meaning: w.type ? `${w.type} : ${w.meaning}` : w.meaning,
      pronunciation: w.pronunciation,
      language_code: w.language_code,
    }));

    return res.json({ words });
  }
}

module.exports = new TestPronunController();
