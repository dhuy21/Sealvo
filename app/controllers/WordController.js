const wordModel = require('../models/words');

class WordController {
    // Afficher la page de vocabulaire
    async monVocabs(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
            }

            // Récupérer tous les mots de l'utilisateur
            const words = await wordModel.findWordsByUserId(req.session.user.id);

            // Grouper les mots par niveau
            const wordsByLevel = {};
            words.forEach(word => {
                // S'assurer que level est une clé valide (0, 1, 2, x)
                const level = word.level;
                
                if (!wordsByLevel[level]) {
                    wordsByLevel[level] = [];
                }
                wordsByLevel[level].push(word);
            });

            res.render('monVocabs', {
                title: 'Mon Vocabulaire',
                user: req.session.user,
                words: words,
                wordsByLevel: wordsByLevel,
                hasWords: words.length > 0
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des mots:', error);
            res.render('monVocabs', {
                title: 'Mon Vocabulaire',
                user: req.session.user,
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
            user: req.session.user
        });
    }
    
    // Traiter la soumission du formulaire d'ajout de mot
    async addWordPost(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour ajouter un mot');
            }
            
            // Récupérer les données du formulaire
            const { word, subject, type, meaning, pronunciation, synonyms, antonyms, example, grammar, level } = req.body;
            
            // Vérifier que les champs obligatoires sont présents
            if (!word || !subject || !type || !meaning || !example || level === undefined) {
                return res.render('addWord', {
                    title: 'Ajouter un mot',
                    user: req.session.user,
                    error: 'Veuillez remplir tous les champs obligatoires',
                    formData: req.body // Pour conserver les valeurs saisies
                });
            }
            
            // Créer le mot dans la base de données
            const wordData = {
                word,
                subject,
                type,
                meaning,
                pronunciation: pronunciation || '', // Valeur par défaut si vide
                synonyms: synonyms || '',
                antonyms: antonyms || '',
                example,
                grammar: grammar || '',
                level
            };
            
            await wordModel.create(wordData, req.session.user.id);
            
            // Rediriger vers la page de vocabulaire avec un message de succès
            res.redirect('/monVocabs?success=Mot ajouté avec succès');
            
        } catch (error) {
            console.error('Erreur lors de l\'ajout du mot:', error);
            res.render('addWord', {
                title: 'Ajouter un mot',
                user: req.session.user,
                error: 'Une erreur est survenue lors de l\'ajout du mot',
                formData: req.body // Pour conserver les valeurs saisies
            });
        }
    }
    
    async deleteAllWords(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour effectuer cette action');
            }
            
            const count = await wordModel.deleteAllWords(req.session.user.id);
            
            // Rediriger avec un message de succès
            if (count > 0) {
                res.redirect(`/monVocabs?success=${count} mot(s) supprimé(s) avec succès`);
            } else {
                res.redirect('/monVocabs?success=Aucun mot à supprimer');
            }
        } catch (error) {
            console.error('Erreur lors de la suppression de tous les mots:', error);
            res.redirect('/monVocabs?error=Une erreur est survenue lors de la suppression des mots');
        }
    }

    async deleteWord(req, res) {
        try {
            const wordId = req.params.id;
            const userId = req.session.user.id;

            // Vérifier si le mot appartient à l'utilisateur
            const word = await wordModel.findUsersByWordId(wordId);
            if (!word) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Mot non trouvé' 
                });
            }

            if (word.user_id !== userId) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Vous n\'êtes pas autorisé à supprimer ce mot' 
                });
            }

            // Supprimer le mot
            await wordModel.deleteWord(wordId, userId);

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
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour modifier un mot');
            }
            
            const wordId = req.params.id;
            const userId = req.session.user.id;
            
            // Récupérer les informations du mot
            const word = await wordModel.findById(wordId);
            
            // Vérifier si le mot existe et appartient à l'utilisateur
            if (!word) {
                return res.redirect('/monVocabs?error=Mot introuvable');
            }
            
            if (word.user_id !== userId) {
                return res.status(403).render('error', {
                    title: 'Accès refusé',
                    user: req.session.user,
                    error: 'Vous n\'êtes pas autorisé à modifier ce mot'
                });
            }
            
            res.render('editVocabs', {
                title: 'Modifier un mot',
                user: req.session.user,
                word: word
            });
        } catch (error) {
            console.error('Erreur lors de la récupération du mot:', error);
            res.redirect('/monVocabs?error=Une erreur est survenue lors de la récupération du mot');
        }
    }

    async editWordPost(req, res) {
        try {
            const wordId = req.params.id;
            const userId = req.session.user.id;

            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour effectuer cette action');
            }

            // Vérifier si le mot appartient à l'utilisateur
            const wordCheck = await wordModel.findById(wordId);
            
            if (!wordCheck) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Mot non trouvé' 
                });
            }
            
            if (wordCheck.user_id !== userId) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Vous n\'êtes pas autorisé à modifier ce mot' 
                });
            }

            // Récupérer les données du formulaire
            const { word, subject, type, meaning, pronunciation, synonyms, antonyms, example, grammar, level } = req.body;

            // Vérifier que les champs obligatoires sont présents
            if (!word || !subject || !type || !meaning || !example) {
                return res.status(403).json({
                    success: false,
                    message: 'Veuillez remplir tous les champs obligatoires'
                });
            }

            // Mettre à jour le mot dans la base de données
            const wordData = {
                word,
                subject,
                type,
                meaning,
                pronunciation: pronunciation || '', // Valeur par défaut si vide
                synonyms: synonyms || '',
                antonyms: antonyms || '',
                example,
                grammar: grammar || '',
                level
            };

            await wordModel.updateWord(wordData, wordId, userId);

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
    
}

module.exports = new WordController();
