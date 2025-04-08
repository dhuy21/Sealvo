const newUserLogin = require('./user/login');
const newUserRegister = require('./user/registre');
const newUserLogout = require('./user/logout');
const siteRouter = require('./site');
const newVocabsRouter = require('./vocab/monVocabs');

function route(app){
    app.use('/login', newUserLogin);
    app.use('/registre', newUserRegister);
    app.use('/logout', newUserLogout);
    app.use('/monVocabs', newVocabsRouter);
    // Utiliser le router site pour toutes les routes, y compris /aboutme
    app.use('/', siteRouter);
}

module.exports = route;