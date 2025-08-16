const wordModel = require('../models/words');
const learningModel = require('../models/learning');
const geminiService = require('../services/gemini');


class WordController {
    // Afficher la page de vocabulaire
    async monVocabs(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
            }
            const package_id = req.query.package;
            // Récupérer tous les mots de l'utilisateur
            const words = await wordModel.findWordsByPackageId(package_id);

            // Grouper les mots par niveau
            const wordsByLevel = {};
            words.forEach(word => {
                // S'assurer que level est une clé valide (0, 1, 2, x)
                const level = word.level;
                word.example = word.example.replace(/\*\*([^\*]+)\*\*/g, '$1');
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
                hasWords: words.length > 0
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des mots:', error);
            res.render('monVocabs', {
                title: 'Mon Vocabulaire',
                user: req.session.user,
                package_id: package_id,
                error: 'Une erreur est survenue lors de la récupération de vos mots.'
            });
        }
    }
    
    // Afficher le formulaire d'ajout de mot
    addWord(req, res) {
        // Vérifier si l'utilisateur est connecté
        if (!req.session.user) {
            return res.redirect('/login?error=Vous devez être connecté pour ajouter un mot');
        }
        
        res.render('addWord', {
            title: 'Ajouter un mot',
            package_id: req.query.package,
            user: req.session.user,
            multipleWords: req.query.multiple === 'true' // Pass flag for multiple words view
        });
    }
    
    // Traiter la soumission du formulaire d'ajout de mot(s)
    async addWordPost(req, res) {
         // Vérifier si l'utilisateur est connecté
         if (!req.session.user) {
            return res.redirect('/login?error=Vous devez être connecté pour ajouter un mot');
        }

        try {
            // Déterminer si c'est un envoi de plusieurs mots
            const isMultipleWords = req.body.isMultipleWords === 'true';
            const package_id = req.query.package;
            let wordsData = [];
            let words_no_example = [];
            let words_with_error_example = [];
            
            if (isMultipleWords) {
                // Traitement de plusieurs mots
                const { words, language_codes, subjects, types, meanings, pronunciations, synonyms, antonyms, examples, grammars, levels } = req.body;
                const wordCount = words.length;
                
                // Traiter chaque mot
                for (let i = 0; i < wordCount; i++) {
                    
                    // Créer le mot dans la base de données
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
                        level: levels[i]
                    };

                    if (wordData.example === '') {
                        words_no_example.push({
                            id: wordData.id,
                            word: wordData.word,
                            language_code: wordData.language_code,
                            meaning: wordData.meaning,
                            type: wordData.type
                        });
                    } else if (wordData.example !== '') {
                        words_with_error_example.push({
                            id: wordData.id,
                            word: wordData.word,
                            language_code: wordData.language_code,
                            meaning: wordData.meaning,
                            type: wordData.type,
                            example: wordData.example
                        });
                    }

                    wordsData.push(wordData);
                }
                
            } else {

                // Traitement d'un seul mot (fonctionnalité existante)
                // Récupérer les données du formulaire
                const { word, language_code, subject, type, meaning, pronunciation, synonyms, antonyms, example, grammar, level } = req.body;
                
                // Créer le mot dans la base de données
                const wordData = {
                    id: 0,
                    word,
                    language_code: language_code.replace(/\([^)]*\)/g, '').trim(),
                    subject,
                    type,
                    meaning,
                    pronunciation: pronunciation || '',
                    synonyms: synonyms || '',
                    antonyms: antonyms || '',
                    example,
                    grammar: grammar || '',
                    level
                };

                if (wordData.example === '') {
                    words_no_example.push({
                        id: wordData.id,
                        word: wordData.word,
                        language_code: wordData.language_code,
                        meaning: wordData.meaning,
                        type: wordData.type
                    });
                } else if (wordData.example !== '') {
                    words_with_error_example.push({
                        id: wordData.id,
                        word: wordData.word,
                        language_code: wordData.language_code,
                        meaning: wordData.meaning,
                        type: wordData.type,
                        example: wordData.example
                    });
                }

                wordsData.push(wordData);
            }

            let errExample = 0;
            // Générer des exemples pour les mots sans exemples
            if (words_no_example.length > 0) {
                console.log('Generating examples for words without examples...');
                
                try {
                    const words_with_examples = await geminiService.generateExemple(words_no_example);
                    if (Array.isArray(words_with_examples) && words_with_examples.length > 0) {
                        console.log('✅ Examples generated successfully');
                        wordsData = await geminiService.replaceExample(wordsData, words_with_examples);
                    } else {
                        console.log('⚠️ No examples were generated');
                        errExample ++ ;
                    }
                } catch (error) {
                    console.error('❌ Error generating examples:', error);
                }
            }
            // Corriger les exemples des mots avec des exemples en erreur
            if (words_with_error_example.length > 0) {
                console.log('Correcting examples for words with error examples...');
                try {
                    const words_with_correct_examples = await geminiService.modifyExample(words_with_error_example);
                    if (Array.isArray(words_with_correct_examples) && words_with_correct_examples.length > 0) {
                        console.log('✅ Examples corrected successfully');
                        wordsData = await geminiService.replaceExample(wordsData, words_with_correct_examples);
                    } else {
                        console.log('⚠️ No examples were corrected');
                        errExample ++ ;
                    }
                } catch (error) {
                    console.error('❌ Error correcting examples:', error);
                }
            }

            // Ajouter chaque mot à la base de données
            let successCount = 0;
            let errChamps = 0;
        
            for (const wordData of wordsData) {
                try {
                    // Vérifier que les champs obligatoires sont présents
                    if (!wordData.word || !wordData.language_code || !wordData.subject || !wordData.type || 
                        !wordData.meaning ) {
                            errChamps ++ ;
                        continue;
                    }
                    
                    // Assurer que level est défini
                    if (wordData.level === undefined || wordData.level === null) {
                        wordData.level = 'x'; // Niveau par défaut
                    }

                    await wordModel.create(wordData, package_id);
                    successCount++;

                } catch (error) {
                    console.error(`Erreur lors de l'ajout du mot ${wordData.word}:`, error);
                    errChamps ++ ;
                }
            }

            // Rediriger avec un message de succès
            res.status(200).json({
                success: true,
                message: `${successCount} mot(s) importé(s) avec succès. ${errChamps} erreur(s) de champs obligatoires. ${errExample} erreur(s) de generation d'exemples`
            });
            

        } catch (error) {
            console.error('Erreur lors de l\'ajout du mot:', error);
            res.render('addWord', {
                title: 'Ajouter un mot',
                package_id: package_id,
                user: req.session.user,
                multipleWords: req.body.isMultipleWords === 'true',
                error: 'Une erreur est survenue lors de l\'ajout du mot',
                formData: req.body
            });
        }
    }
    
    async deleteAllWords(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour effectuer cette action');
            }
            const package_id = req.query.package;
            const count = await wordModel.deleteAllWords(package_id);
            
            // Rediriger avec un message de succès
            if (count) {
                console.log('Le(s) mot(s) supprimé(s) avec succès');
                res.status(200).json({
                    success: true,
                    message: `Le(s) mot(s) supprimé(s) avec succès`
                });
            } else {
                console.log('Aucun mot à supprimer');
                res.status(200).json({
                    success: true,
                    message: 'Aucun mot à supprimer'
                });
            }
            
        } catch (error) {
            const package_id = req.query.package;
            console.error('Erreur lors de la suppression de tous les mots:', error);
            res.status(500).json({
                success: false,
                message: 'Une erreur est survenue lors de la suppression des mots'
            });
        }
    }

    async deleteWord(req, res) {
        try {
            const detail_id = req.params.id;
            const package_id = req.query.package;
            // Vérifier si le mot appartient à l'utilisateur
            const word = await wordModel.findUsersByWordId(detail_id);
            if (!word) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Mot non trouvé' 
                });
            }

            if (word.package_id != package_id) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Vous n\'êtes pas autorisé à supprimer ce mot' 
                });
            }

            // Supprimer le mot
            await wordModel.deleteWord(detail_id, package_id);

            res.json({ 
                success: true, 
                message: 'Mot supprimé avec succès' 
            });
        } catch (error) {
            console.error('Erreur lors de la suppression du mot:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erreur lors de la suppression du mot' 
            });
        }
    }

    // Afficher le formulaire d'édition de mot
    async editWord(req, res) {
        const package_id = req.query.package;
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour modifier un mot');
            }
            
            const detail_id = req.params.id;
            
            
            // Récupérer les informations du mot
            const word = await wordModel.findById(detail_id);
            
            // Vérifier si le mot existe et appartient à l'utilisateur
            if (!word) {
                return res.redirect('/monVocabs?error=Mot introuvable');
            }
            
            if (word.package_id !== package_id) {
                return res.status(403).render('error', {
                    title: 'Accès refusé',
                    user: req.session.user,
                    error: 'Vous n\'êtes pas autorisé à modifier ce mot'
                });
            }
            
            res.render('editVocabs', {
                title: 'Modifier un mot',
                user: req.session.user,
                word: word,
                package_id: package_id
            });
        } catch (error) {
            console.error('Erreur lors de la récupération du mot:', error);
            res.redirect(`/monVocabs?package=${package_id}&error=Une erreur est survenue lors de la récupération du mot`);
        }
    }

    async editWordPost(req, res) {
        const detail_id = req.params.id;
        const package_id = req.query.package;
        try {
            
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour effectuer cette action');
            }

            // Vérifier si le mot appartient à l'utilisateur
            const wordCheck = await wordModel.findById(detail_id);
            
            if (!wordCheck) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Mot non trouvé' 
                });
            }
            
            if (wordCheck.package_id != package_id) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Vous n\'êtes pas autorisé à modifier ce mot' 
                });
            }

            // Récupérer les données du formulaire
            const { word, language_code, type, meaning, pronunciation, synonyms, antonyms, example, grammar, level } = req.body;

            // Vérifier que les champs obligatoires sont présents
            if (!word || !language_code || !type || !meaning || !example) {
                return res.status(403).json({
                    success: false,
                    message: 'Veuillez remplir tous les champs obligatoires'
                });
            }

            let words_no_example = [];
            let words_with_error_example = [];

            // Mettre à jour le mot dans la base de données
            let wordData = {
                id: 0,
                word,
                language_code: language_code.replace(/\([^)]*\)/g, '').trim(),
                type,
                meaning,
                pronunciation: pronunciation || '', // Valeur par défaut si vide
                synonyms: synonyms || '',
                antonyms: antonyms || '',
                example,
                grammar: grammar || '',
                level
            };

            if (wordData.example === '') {
                words_no_example.push({
                    id: wordData.id,
                    word: wordData.word,
                    language_code: wordData.language_code,
                    meaning: wordData.meaning,
                    type: wordData.type
                });
            } else if (wordData.example !== '') {
                words_with_error_example.push({
                    id: wordData.id,
                    word: wordData.word,
                    language_code: wordData.language_code,
                    meaning: wordData.meaning,
                    type: wordData.type,
                    example: wordData.example
                });
            }

            let errExample = 0;
            // Générer des exemples pour les mots sans exemples
            if (words_no_example.length > 0) {
                console.log('Generating examples for words without examples...');
                
                try {
                    const words_with_examples = await geminiService.generateExemple(words_no_example);
                    if (Array.isArray(words_with_examples) && words_with_examples.length > 0) {
                        console.log('✅ Examples generated successfully');
                        wordData = await geminiService.replaceExample(wordData, words_with_examples);
                    } else {
                        console.log('⚠️ No examples were generated');
                        errExample ++ ;
                    }
                } catch (error) {
                    console.error('❌ Error generating examples:', error);
                }
            }
            // Corriger les exemples des mots avec des exemples en erreur
            if (words_with_error_example.length > 0) {
                console.log('Correcting examples for words with error examples...');
                try {
                    const words_with_correct_examples = await geminiService.modifyExample(words_with_error_example);
                    if (Array.isArray(words_with_correct_examples) && words_with_correct_examples.length > 0) {
                        console.log('✅ Examples corrected successfully');
                        wordData = await geminiService.replaceExample(wordData, words_with_correct_examples);
                    } else {
                        console.log('⚠️ No examples were corrected');
                        errExample ++ ;
                    }
                } catch (error) {
                    console.error('❌ Error correcting examples:', error);
                }
            }

            await wordModel.updateWord(wordData, detail_id, package_id);

            // Rediriger vers la page de vocabulaire avec un message de succès
            res.json({
                success: true,
                message: 'Mot modifié avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la modification du mot:', error);
            res.status(500).json({
                success: false,
                message: 'Une erreur est survenue lors de la modification du mot'
            });
        }
    }

    async learnVocabs(req, res) {
        const package_id = req.query.package;
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour apprendre des mots');
            }

            // Récupérer les mots de l'utilisateur
            const words = await wordModel.findWordsByPackageId(package_id);
            const wordIdsToReview = await learningModel.findWordsTodayToLearn(package_id);

            // Add dueToday flag to each word
            words.forEach(word => {
                word.dueToday = wordIdsToReview.some(item => item.detail_id === word.detail_id);
                word.example = word.example.replace(/\*\*([^\*]+)\*\*/g, '$1');
            });

            console.log(words);

            res.render('learnVocabs', {
                title: 'Apprendre des mots',
                user: req.session.user,
                words: words,
                package_id: package_id
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des mots à apprendre:', error);
            res.redirect(`/monVocabs?package=${package_id}&error=Une erreur est survenue lors de la récupération des mots à apprendre`);
        }
    }
    
}

module.exports = new WordController();
