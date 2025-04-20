const newUserLogin = require('./user/login');
const newUserRegister = require('./user/registre');
const newUserLogout = require('./user/logout');
const siteRouter = require('./site');
const newVocabsRouter = require('./vocab/monVocabs');
const gameRouter = require('./game/game');

function route(app) {
    app.use('/login', newUserLogin);
    app.use('/registre', newUserRegister);
    app.use('/logout', newUserLogout);
    app.use('/monVocabs', newVocabsRouter);
    app.use('/games', gameRouter);
    app.use('/', siteRouter);
}

module.exports = route;