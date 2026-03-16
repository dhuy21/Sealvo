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
const healthRouter = require('./health');
const LearningController = require('../controllers/LearningController');
const { isAuthenticatedAPI } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

function route(app) {
  app.use('/health', healthRouter);
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
  app.post(
    '/update-streak',
    isAuthenticatedAPI,
    asyncHandler(LearningController.checkAndUpdateStreak)
  );
  app.use('/', siteRouter);
}

module.exports = route;
