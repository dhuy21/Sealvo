const express = require('express');
const router = express.Router();
const wordScrambleRoutes = require('./word_scramble');
const flashMatchRoutes = require('./flash_match');
const speedVocabRoutes = require('./speed_vocab');
const vocabQuizRoutes = require('./vocab_quiz');
const gameController = require('../../controllers/gameControllers/GameController');
// Middleware d'authentification
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
};

// Routes spécifiques aux jeux individuels
router.use('/word-scramble', isAuthenticated, wordScrambleRoutes);
router.use('/flash-match', isAuthenticated, flashMatchRoutes);
router.use('/speed-vocab', isAuthenticated, speedVocabRoutes);
router.use('/vocab-quiz', isAuthenticated, vocabQuizRoutes);


// Page d'accueil des jeux
router.get('/', isAuthenticated, gameController.index);


module.exports = router;