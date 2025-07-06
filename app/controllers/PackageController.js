const packageModel = require('../models/packages');

class PackageController {
    async myPackages(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
            }
            // Récupérer les packages de l'utilisateur
            const packages = await packageModel.findPackagesByUserId(req.session.user.id);
            res.render('myPackages', {
                title: 'Mes Packages',
                user: req.session.user,
                packages: packages
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des packages:', error);
            res.render('myPackages', {
                title: 'Mes Packages',
                user: req.session.user,
                error: 'Une erreur est survenue lors de la récupération de vos packages.'
            });
        }
    }

    async createPackagePost(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Vous devez être connecté pour accéder à cette page'
                });
            }
            // Récupérer les informations du package
            const packageData = req.body;
            packageData.user_id = req.session.user.id;
            const packageId = await packageModel.create(packageData);
            res.json({
                success: true,
                message: 'Package créé avec succès',
                packageId: packageId
            });
        } catch (error) {
            console.error('Erreur lors de la création du package:', error);
            res.status(500).json({
                success: false,
                message: 'Une erreur est survenue lors de la création de votre package.'
            });
        }
    }

    async deletePackagePost(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Vous devez être connecté pour accéder à cette page'
                });
            }
            // Récupérer l'id du package
            const packageId = req.params.id;
            // Vérifier si le package appartient à l'utilisateur
            const myPackage = await packageModel.findPackageById(packageId);
            if (!myPackage) {
                return res.status(404).json({
                    success: false,
                    message: 'Package non trouvé'
                });
            }
            if (myPackage.user_id !== req.session.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Vous n\'êtes pas autorisé à supprimer ce package'
                });
            }
            // Supprimer le package
            await packageModel.deletePackage(packageId);
            res.json({
                success: true,
                message: 'Package supprimé avec succès'
            });
        } catch (error) {
            console.error('Erreur lors de la suppression du package:', error);
            res.status(500).json({
                success: false,
                message: 'Une erreur est survenue lors de la suppression de votre package.'
            });
        }
    }

    async editPackagePost(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Vous devez être connecté pour accéder à cette page'
                });
            }
            // Récupérer l'id du package
            const packageId = req.params.id;
            // Vérifier si le package appartient à l'utilisateur
            const myPackage = await packageModel.findPackageById(packageId);
            if (!myPackage) {
                return res.status(404).json({
                    success: false,
                    message: 'Package non trouvé'
                });
            }
            if (myPackage.user_id !== req.session.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Vous n\'êtes pas autorisé à modifier ce package'
                });
            }
            // Modifier le package
            const packageData = req.body;
            await packageModel.updateInfoPackage(packageData, packageId);
            
            // Mettre à jour le mode si fourni
            if (packageData.mode) {
                await packageModel.updateModePackage(packageId, packageData.mode);
            }
            
            res.json({
                success: true,
                message: 'Package modifié avec succès'
            });
        } catch (error) {
            console.error('Erreur lors de la modification du package:', error);
            res.status(500).json({
                success: false,
                message: 'Une erreur est survenue lors de la modification de votre package.'
            });
        }
    }
}

module.exports = new PackageController();