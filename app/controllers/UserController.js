class UserController {
    login(req, res) {
        res.render('login');
    }
    registre(req, res) {
        res.render('registre');
    }
    logout(req, res) {
        res.render('logout');
    }
    

}
module.exports = new UserController();