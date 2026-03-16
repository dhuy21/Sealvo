const learningModel = require('../../models/learning');
const { NotFoundError } = require('../../errors/AppError');
const levelGame = 'x';

class FlashMatchController {
  constructor() {
    this.getCardsForFlashMatch = this.getCardsForFlashMatch.bind(this);
  }

  async getCardsForFlashMatch(req, res) {
    const package_id = req.query.package;
    const minPairsCount = 4;
    const maxPairsCount = 15;

    const words = await learningModel.findWordsWithDetailsByLevel(package_id, levelGame);

    if (words.length < minPairsCount) {
      throw new NotFoundError(
        `Vous devez avoir au moins ${minPairsCount} mots au niveau ${levelGame} dans votre vocabulaire pour jouer à ce niveau de difficulté.`
      );
    }

    const pairsCount = Math.min(words.length, maxPairsCount);
    const shuffledWords = this.shuffleArray([...words]);
    const selectedWords = shuffledWords.slice(0, pairsCount);

    const cards = [];
    selectedWords.forEach((word, index) => {
      cards.push({ pairId: index, type: 'word', content: word.word });
      let meaning = word.type ? `${word.type} : ${word.meaning}` : word.meaning;
      cards.push({ pairId: index, type: 'meaning', content: meaning });
    });

    const wordIdsForUpdate = selectedWords.map((word) => word.id);

    return res.json({ cards, wordIds: wordIdsForUpdate });
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

module.exports = new FlashMatchController();
