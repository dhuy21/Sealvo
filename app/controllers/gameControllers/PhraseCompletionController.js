const learningModel = require('../../models/learning');
const levelGame = '0';

class PhraseCompletionController {
  constructor() {
    this.getPhrasesForCompletion = this.getPhrasesForCompletion.bind(this);
    this.getAvailableWordsCount = this.getAvailableWordsCount.bind(this);
  }

  async getAvailableWordsCount(req, res) {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: 'Vous devez être connecté pour jouer.' });
      }

      const package_id = req.query.package;
      const wordCount = await learningModel.countUserWordsByLevel(package_id, levelGame);

      return res.json({ success: true, count: wordCount });
    } catch (error) {
      console.error('Erreur lors du comptage des mots disponibles:', error);
      return res
        .status(500)
        .json({ error: 'Une erreur est survenue lors du comptage des mots disponibles.' });
    }
  }

  async getPhrasesForCompletion(req, res) {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: 'Vous devez être connecté pour jouer.' });
      }
      const package_id = req.query.package;

      const words = await learningModel.findWordsWithDetailsByLevel(package_id, levelGame);

      let phrases = [];

      for (const word of words) {
        let phrase = '';
        let correctWords = [];

        if (word.example && word.example.trim() !== '') {
          phrase = word.example;

          if (phrase.length > 0) {
            // Chercher les mots entre ** et **
            const regex = /\*\*([^*]+)\*\*/g;
            correctWords = [...phrase.matchAll(regex)].map((m) => m[1]);
            phrase = phrase.replace(regex, '_____');
          }
        }
        phrases.push({
          phrase: phrase,
          word: word.word,
          meaningWord: word.meaning,
          correctWords: correctWords, // Nous envoyons directement le mot correct pour la vérification côté client
        });
      }
      phrases = this.shuffleArray(phrases);

      return res.json({
        phrases: phrases,
      });
    } catch (error) {
      console.error("Erreur lors de la génération d'une phrase:", error);
      res
        .status(500)
        .json({ error: "Une erreur est survenue lors de la génération d'une phrase." });
    }
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
