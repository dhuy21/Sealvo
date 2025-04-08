class SiteController {

    // [GET] /
    index(req, res) {
        res.render('home');
    }
}

module.exports = new SiteController();