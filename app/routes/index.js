const newUserLogin = require('./user/login');
const newUserRegister = require('./user/registre');
const newUserLogout = require('./user/logout');
const siteRouter = require('./site');
const newVocabsRouter = require('./vocab/monVocabs');
const gameRouter = require('./game/game');
const apiRouter = require('./api');
const authRouter = require('./auth/auth');
const newUserDashboard = require('./user/dashboard');
const newUserPackages = require('./package/package');
const levelProgressRouter = require('./level_progress');
// Import controllers

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
    app.use('/dashboard', newUserDashboard);
    app.use('/myPackages', newUserPackages);
    app.use('/games', gameRouter);
    app.use('/api', apiRouter);
    app.use('/auth', authRouter);
    app.use('/level-progress', levelProgressRouter);
    
    // Streak update route
    app.post('/update-streak', ensureAuthenticated, LearningController.checkAndUpdateStreak);
    
    // All site routes including /feedback are handled here
    app.use('/', siteRouter);
}

module.exports = route;