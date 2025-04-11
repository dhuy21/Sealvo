const express = require('express');
const router = express.Router();
const wordController = require('../../controllers/WordController');
const importFile = require('../../services/importFile');

// Middleware d'authentification
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
};
// Routes pour l'ajout de mots
router.get('/add', isAuthenticated, wordController.addWord);
router.post('/add', isAuthenticated, wordController.addWordPost);

// Route pour l'importation de mots depuis un fichier
router.post('/add/import', isAuthenticated, importFile.importWords);

// Route pour la suppression de tous les mots
router.post('/deleteAll', isAuthenticated, wordController.deleteAllWords);

// Route pour la suppression d'un mot individuel
router.post('/delete/:id', isAuthenticated, wordController.deleteWord);

// Routes pour la modification d'un mot
router.get('/edit/:id', isAuthenticated, wordController.editWord);
router.post('/edit/:id', isAuthenticated, wordController.editWordPost);

//Route pour apprendre un vocabulaire
router.get('/learn', isAuthenticated, wordController.learnVocabs);

// Afficher tous les mots (tableau de bord)
router.get('/', isAuthenticated, wordController.monVocabs);

module.exports = router;