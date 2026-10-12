const learningModel = require('../../models/learning');
const { NotFoundError } = require('../../errors/AppError');
const levelGame = 'x';

class VocabQuizController {
  constructor() {
    this.getQuestionForVocabQuiz = this.getQuestionForVocabQuiz.bind(this);
    this.shuffleArray = this.shuffleArray.bind(this);
    this.getAvailableWordsCount = this.getAvailableWordsCount.bind(this);
  }

  async getQuestionForVocabQuiz(req, res) {
    const package_id = req.query.package;
    const optionsCount = 6;

    const words = await learningModel.findWordsWithDetailsByLevel(package_id, levelGame);

    if (words.length < optionsCount) {
      throw new NotFoundError(
        `Vous devez avoir au moins ${optionsCount} mots au niveau ${levelGame} dans votre vocabulaire pour jouer à ce niveau de difficulté.`
      );
    }

    let questionWords = [];

    for (let i = 0; i < words.length; i++) {
      let correctMeaning = [];

      const shuffledWords = this.shuffleArray([...words]);
      questionWords[i] = shuffledWords[0];
      questionWords[i].correctIndex = [];
      questionWords[i].incorrectOptions = shuffledWords.slice(1, optionsCount).map((word) => ({
        id: word.id,
        word: word.word,
        type: word.type,
        meaning: word.meaning,
      }));
      if (questionWords[i].type) {
        correctMeaning[0] = `${questionWords[i].type} : `;
        correctMeaning[0] += questionWords[i].meaning;
        questionWords[i].options = [];
        questionWords[i].options.push(correctMeaning[0]);
      }

      questionWords[i].incorrectOptions.forEach((word) => {
        let meaning = '';
        if (word.type) {
          meaning += `${word.type} : `;
        }
        meaning += word.meaning;

        if (questionWords[i].word === word.word) {
          correctMeaning.push(meaning);
          questionWords[i].options.push(meaning);
        } else {
          questionWords[i].options.push(meaning);
        }
      });

      questionWords[i].options = this.shuffleArray(questionWords[i].options);

      for (let j = 0; j < correctMeaning.length; j++) {
        questionWords[i].correctIndex.push(
          questionWords[i].options.findIndex((option) => option === correctMeaning[j])
        );
      }
    }

    return res.json({ questionWords });
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  async getAvailableWordsCount(req, res) {
    const package_id = req.query.package;
    const wordCount = await learningModel.countUserWordsByLevel(package_id, levelGame);

    return res.json({ success: true, count: wordCount });
  }
}

module.exports = new VocabQuizController();
