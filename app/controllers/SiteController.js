class SiteController {

    // [GET] /
    index(req, res) {
        res.render('home', {
            title: 'Accueil',
            user: req.session.user
        });
    }

    // Page "À propos de moi"
    aboutme(req, res) {
        res.render('aboutme', {
            title: 'À propos de moi',
            user: req.session.user
        });
    }

    // Tableau de bord (protégé)
    dashboard(req, res) {
        // Vérifier si l'utilisateur est connecté
        if (!req.session.user) {
            return res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
        }
        
        res.render('dashboard', {
            title: 'Tableau de bord',
            user: req.session.user
        });
    }
}

module.exports = new SiteController();