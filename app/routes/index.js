const newUserLogin = require('./user/login');
const newUserRegister = require('./user/registre');
const newUserLogout = require('./user/logout');
const siteRouter = require('./site');


function route(app){
    app.use('/login', newUserLogin);
    app.use('/registre', newUserRegister);
    app.use('/logout', newUserLogout);
    app.use('/', siteRouter);
}

module.exports = route;