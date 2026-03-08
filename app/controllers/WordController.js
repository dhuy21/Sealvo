const wordModel = require('../models/words');
const learningModel = require('../models/learning');
const geminiService = require('../services/gemini');
const { setFlash } = require('../middleware/flash');
const cache = require('../core/cache');
const CACHE_TTL = require('../config/cache');

class WordController {
  async monVocabs(req, res) {
    try {
      if (!req.session.user) {
        setFlash(req, 'error', 'Vous devez être connecté pour accéder à cette page');
        return res.redirect('/login');
      }
      const package_id = req.query.package;
      let words = await cache.get(`words:${package_id}`);
      if (!words) {
        words = await wordModel.findWordsByPackageId(package_id);
        await cache.set(`words:${package_id}`, words, CACHE_TTL.WORDS);
      }

      const wordsByLevel = {};
      words.forEach((word) => {
        const level = word.level;
        word.example = (word.example || '').replace(/\*\*([^*]+)\*\*/g, '$1');
        if (!wordsByLevel[level]) {
          wordsByLevel[level] = [];
        }
        wordsByLevel[level].push(word);
      });

      res.render('monVocabs', {
        title: 'Mon Vocabulaire',
        user: req.session.user,
        words: words,
        package_id: package_id,
        wordsByLevel: wordsByLevel,
        hasWords: words.length > 0,
      });
    } catch (err) {
      console.error('Erreur lors de la récupération des mots:', err);
      res.render('monVocabs', {
        title: 'Mon Vocabulaire',
        user: req.session.user,
        package_id: req.query.package,
        error: 'Une erreur est survenue lors de la récupération de vos mots.',
      });
    }
  }

  addWord(req, res) {
    if (!req.session.user) {
      setFlash(req, 'error', 'Vous devez être connecté pour ajouter un mot');
      return res.redirect('/login');
    }

    res.render('addWord', {
      title: 'Ajouter un mot',
      package_id: req.query.package,
      user: req.session.user,
      multipleWords: req.query.multiple === 'true', // Pass flag for multiple words view
    });
  }

  async addWordPost(req, res) {
    if (!req.session.user) {
      setFlash(req, 'error', 'Vous devez être connecté pour ajouter un mot');
      return res.redirect('/login');
    }

    const package_id = req.query.package;

    try {
      let wordsData = [];
      let words_no_example = [];
      let words_with_error_example = [];

      if (package_id) {
        const {
          words,
          language_codes,
          subjects,
          types,
          meanings,
          pronunciations,
          synonyms,
          antonyms,
          examples,
          grammars,
          levels,
        } = req.body;
        const wordCount = words.length;
        for (let i = 0; i < wordCount; i++) {
          const wordData = {
            id: i,
            word: words[i],
            language_code: language_codes[i].replace(/\([^)]*\)/g, '').trim(),
            subject: subjects[i],
            type: types[i],
            meaning: meanings[i],
            pronunciation: pronunciations[i] || '',
            synonyms: synonyms[i] || '',
            antonyms: antonyms[i] || '',
            example: examples[i],
            grammar: grammars[i] || '',
            level: levels[i],
          };

          if (wordData.example === '') {
            words_no_example.push({
              id: wordData.id,
              word: wordData.word,
              language_code: wordData.language_code,
              meaning: wordData.meaning,
              type: wordData.type,
            });
          } else if (wordData.example !== '') {
            words_with_error_example.push({
              id: wordData.id,
              word: wordData.word,
              language_code: wordData.language_code,
              meaning: wordData.meaning,
              type: wordData.type,
              example: wordData.example,
            });
          }

          wordsData.push(wordData);
        }
      }

      let errExample = 0;
      // Générer des exemples pour les mots sans exemples
      if (words_no_example.length > 0) {
        try {
          const words_with_examples = await geminiService.generateExemple(words_no_example);
          if (Array.isArray(words_with_examples) && words_with_examples.length > 0) {
            wordsData = await geminiService.replaceExample(wordsData, words_with_examples);
          } else {
            errExample++;
          }
        } catch {
          errExample++;
        }
      }
      // Corriger les exemples des mots avec des exemples en erreur
      if (words_with_error_example.length > 0) {
        try {
          const words_with_correct_examples =
            await geminiService.modifyExample(words_with_error_example);
          if (
            Array.isArray(words_with_correct_examples) &&
            words_with_correct_examples.length > 0
          ) {
            wordsData = await geminiService.replaceExample(wordsData, words_with_correct_examples);
          } else {
            errExample++;
          }
        } catch {
          errExample++;
        }
      }

      let successCount = 0;
      let errChamps = 0;

      for (const wordData of wordsData) {
        try {
          if (
            !wordData.word ||
            !wordData.language_code ||
            !wordData.subject ||
            !wordData.type ||
            !wordData.meaning
          ) {
            errChamps++;
            continue;
          }

          if (wordData.level === undefined || wordData.level === null) {
            wordData.level = 'x';
          }

          await wordModel.create(wordData, package_id);
          successCount++;
        } catch {
          errChamps++;
        }
      }

      if (successCount > 0) {
        await cache.del([`dashboard:${req.session.user.id}`, `words:${package_id}`]);
      }

      res.status(200).json({
        success: true,
        message: `${successCount} mot(s) importé(s) avec succès. ${errChamps} erreur(s) de champs obligatoires. ${errExample} erreur(s) de generation d'exemples`,
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout du mot:", error);
      res.render('addWord', {
        title: 'Ajouter un mot',
        package_id: package_id,
        user: req.session.user,
        error: "Une erreur est survenue lors de l'ajout du mot",
        formData: req.body,
      });
    }
  }

  async deleteAllWords(req, res) {
    try {
      if (!req.session.user) {
        setFlash(req, 'error', 'Vous devez être connecté pour effectuer cette action');
        return res.redirect('/login');
      }
      const package_id = req.query.package;
      const count = await wordModel.deleteAllWords(package_id);

      if (count) {
        await cache.del([`dashboard:${req.session.user.id}`, `words:${package_id}`]);
        res.status(200).json({
          success: true,
          message: `Le(s) mot(s) supprimé(s) avec succès`,
        });
      } else {
        res.status(200).json({
          success: true,
          message: 'Aucun mot à supprimer',
        });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de tous les mots:', error);
      res.status(500).json({
        success: false,
        message: 'Une erreur est survenue lors de la suppression des mots',
      });
    }
  }

  async deleteWord(req, res) {
    try {
      if (!req.session.user) {
        return res.status(401).json({
          success: false,
          message: 'Vous devez être connecté pour supprimer un mot',
        });
      }

      const detail_id = req.params.id;
      const package_id = req.query.package;
      const word = await wordModel.findUsersByWordId(detail_id);
      if (!word) {
        return res.status(404).json({
          success: false,
          message: 'Mot non trouvé',
        });
      }

      if (word.package_id != package_id) {
        return res.status(403).json({
          success: false,
          message: "Vous n'êtes pas autorisé à supprimer ce mot",
        });
      }

      await wordModel.deleteWord(detail_id, package_id);
      await cache.del([`dashboard:${req.session.user.id}`, `words:${package_id}`]);

      res.json({
        success: true,
        message: 'Mot supprimé avec succès',
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du mot:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du mot',
      });
    }
  }

  async editWord(req, res) {
    const package_id = req.query.package;
    try {
      if (!req.session.user) {
        setFlash(req, 'error', 'Vous devez être connecté pour modifier un mot');
        return res.redirect('/login');
      }

      const detail_id = req.params.id;

      const word = await wordModel.findById(detail_id);

      if (!word) {
        setFlash(req, 'error', 'Mot introuvable');
        return res.redirect(`/monVocabs?package=${package_id}`);
      }

      if (word.package_id != package_id) {
        return res.status(403).render('error', {
          title: 'Accès refusé',
          user: req.session.user,
          error: "Vous n'êtes pas autorisé à modifier ce mot",
        });
      }

      res.render('editVocabs', {
        title: 'Modifier un mot',
        user: req.session.user,
        word: word,
        package_id: package_id,
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du mot:', error);
      setFlash(req, 'error', 'Une erreur est survenue lors de la récupération du mot');
      res.redirect(`/monVocabs?package=${package_id}`);
    }
  }

  async editWordPost(req, res) {
    const detail_id = req.params.id;
    const package_id = req.query.package;
    try {
      if (!req.session.user) {
        setFlash(req, 'error', 'Vous devez être connecté pour effectuer cette action');
        return res.redirect('/login');
      }

      const wordCheck = await wordModel.findById(detail_id);

      if (!wordCheck) {
        return res.status(404).json({
          success: false,
          message: 'Mot non trouvé',
        });
      }

      if (wordCheck.package_id != package_id) {
        return res.status(403).json({
          success: false,
          message: "Vous n'êtes pas autorisé à modifier ce mot",
        });
      }

      const {
        word,
        language_code,
        type,
        meaning,
        pronunciation,
        synonyms,
        antonyms,
        example,
        grammar,
        level,
      } = req.body;

      if (!word || !language_code || !type || !meaning || !example) {
        return res.status(403).json({
          success: false,
          message: 'Veuillez remplir tous les champs obligatoires',
        });
      }

      let words_no_example = [];
      let words_with_error_example = [];

      let wordData = {
        id: 0,
        word,
        language_code: language_code.replace(/\([^)]*\)/g, '').trim(),
        type,
        meaning,
        pronunciation: pronunciation || '',
        synonyms: synonyms || '',
        antonyms: antonyms || '',
        example,
        grammar: grammar || '',
        level,
      };

      if (wordData.example === '') {
        words_no_example.push({
          id: wordData.id,
          word: wordData.word,
          language_code: wordData.language_code,
          meaning: wordData.meaning,
          type: wordData.type,
        });
      } else if (wordData.example !== '') {
        words_with_error_example.push({
          id: wordData.id,
          word: wordData.word,
          language_code: wordData.language_code,
          meaning: wordData.meaning,
          type: wordData.type,
          example: wordData.example,
        });
      }

      let errExample = 0;
      if (words_no_example.length > 0) {
        try {
          const words_with_examples = await geminiService.generateExemple(words_no_example);
          if (Array.isArray(words_with_examples) && words_with_examples.length > 0) {
            wordData = await geminiService.replaceExample(wordData, words_with_examples);
          } else {
            errExample++;
          }
        } catch {
          errExample++;
        }
      }
      if (words_with_error_example.length > 0) {
        try {
          const words_with_correct_examples =
            await geminiService.modifyExample(words_with_error_example);
          if (
            Array.isArray(words_with_correct_examples) &&
            words_with_correct_examples.length > 0
          ) {
            wordData = await geminiService.replaceExample(wordData, words_with_correct_examples);
          } else {
            errExample++;
          }
        } catch {
          errExample++;
        }
      }

      await wordModel.updateWord(wordData, detail_id, package_id);
      await cache.del([`dashboard:${req.session.user.id}`, `words:${package_id}`]);

      res.json({
        success: true,
        message:
          errExample > 0
            ? `Mot modifié avec succès. ${errExample} erreur(s) de génération d'exemples.`
            : 'Mot modifié avec succès',
      });
    } catch (error) {
      console.error('Erreur lors de la modification du mot:', error);
      res.status(500).json({
        success: false,
        message: 'Une erreur est survenue lors de la modification du mot',
      });
    }
  }

  async learnVocabs(req, res) {
    const package_id = req.query.package;
    try {
      if (!req.session.user) {
        setFlash(req, 'error', 'Vous devez être connecté pour apprendre des mots');
        return res.redirect('/login');
      }

      let words = await cache.get(`words:${package_id}`);
      if (!words) {
        words = await wordModel.findWordsByPackageId(package_id);
        await cache.set(`words:${package_id}`, words, CACHE_TTL.WORDS);
      }
      const wordIdsToReview = await learningModel.findWordsTodayToLearn(package_id);

      words.forEach((word) => {
        word.dueToday = wordIdsToReview.some((item) => item.detail_id === word.detail_id);
        word.example = (word.example || '').replace(/\*\*([^*]+)\*\*/g, '$1');
      });

      res.render('learnVocabs', {
        title: 'Apprendre des mots',
        user: req.session.user,
        words: words,
        package_id: package_id,
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des mots à apprendre:', error);
      setFlash(
        req,
        'error',
        'Une erreur est survenue lors de la récupération des mots à apprendre'
      );
      res.redirect(`/monVocabs?package=${package_id}`);
    }
  }
}

module.exports = new WordController();
