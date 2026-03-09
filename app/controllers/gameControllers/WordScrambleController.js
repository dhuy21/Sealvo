const learningModel = require('../../models/learning');
const levelGame = '0';

class WordScrambleController {
  constructor() {
    this.getRandomWordsForScramble = this.getRandomWordsForScramble.bind(this);
    this.scrambleWord = this.scrambleWord.bind(this);
  }

  async getRandomWordsForScramble(req, res) {
    try {
      const package_id = req.query.package;

      const rawWords = await learningModel.findWordsWithDetailsByLevel(package_id, levelGame);
      let words = rawWords.map((w) => {
        let meaning = w.type ? `${w.type} : ${w.meaning}` : w.meaning;
        return { word: w.word, scrambled: this.scrambleWord(w.word), meaning };
      });
      words = this.shuffleArray(words);

      return res.json({ words });
    } catch (error) {
      console.error("Erreur lors de la récupération d'un mot aléatoire:", error);
      return res
        .status(500)
        .json({ error: "Une erreur est survenue lors de la récupération d'un mot." });
    }
  }

  scrambleWord(word) {
    const letters = word.split('');
    let scrambled;

    // S'assurer que le mot mélangé est différent de l'original
    do {
      scrambled = this.shuffleArray([...letters]).join('');
    } while (scrambled === word && word.length > 1);

    return scrambled;
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

module.exports = new WordScrambleController();
