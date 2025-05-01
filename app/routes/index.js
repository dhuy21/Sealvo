const newUserLogin = require('./user/login');
const newUserRegister = require('./user/registre');
const newUserLogout = require('./user/logout');
const siteRouter = require('./site');
const newVocabsRouter = require('./vocab/monVocabs');
const gameRouter = require('./game/game');

// Import controllers
const SiteController = require('../controllers/SiteController');
const UserController = require('../controllers/UserController');
const WordController = require('../controllers/WordController');
const LearningController = require('../controllers/LearningController');

// Authentication middleware
function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.status(401).json({ success: false, message: 'Unauthorized' });
}

function route(app) {
    app.use('/login', newUserLogin);
    app.use('/registre', newUserRegister);
    app.use('/logout', newUserLogout);
    app.use('/monVocabs', newVocabsRouter);
    // Removing duplicate route for feedback, it's already included in siteRouter
    app.use('/games', gameRouter);
    
    // Streak update route
    app.post('/api/update-streak', ensureAuthenticated, async (req, res) => {
        try {
            const result = await LearningController.checkAndUpdateStreak(req.session.user.id);
            res.json({ success: true, ...result });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du streak:', error);
            res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du streak' });
        }
    });
    
    // All site routes including /feedback are handled here
    app.use('/', siteRouter);
}

module.exports = route;