const packageModel = require('../models/packages');
const wordModel = require('../models/words');
const learningModel = require('../models/learning');
class PackageController {
    async myPackages(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour accéder à cette page');
            }
            // Récupérer les packages de l'utilisateur
            const packages = await packageModel.findPackagesByUserId(req.session.user.id);
            // Récupérer tous les packages publics
            const publicPackages = await packageModel.findAllPublicPackages();
            
            res.render('myPackages', {
                title: 'Mes Packages',
                user: req.session.user,
                packages: packages,
                publicPackages: publicPackages
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
            
            // Si le package est créé en mode public, le désactiver automatiquement
            let message = 'Package créé avec succès';
            if (packageData.mode === 'public') {
                await packageModel.updateActivationPackage(packageId, false);
                message = 'Package créé avec succès. Il a été automatiquement désactivé car il est public.';
            }
            
            res.json({
                success: true,
                message: message,
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
            let message = 'Package modifié avec succès';
            if (packageData.mode) {
                await packageModel.updateModePackage(packageId, packageData.mode);
                
                // Si le package devient public, le désactiver automatiquement pour la sécurité
                if (packageData.mode === 'public') {
                    await packageModel.updateActivationPackage(packageId, false);
                    message = 'Package modifié avec succès. Il a été automatiquement désactivé car il est maintenant public.';
                }
            }
            
            res.json({
                success: true,
                message: message
            });
        } catch (error) {
            console.error('Erreur lors de la modification du package:', error);
            res.status(500).json({
                success: false,
                message: 'Une erreur est survenue lors de la modification de votre package.'
            });
        }
    }

    async toggleActivationPost(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Vous devez être connecté pour accéder à cette page'
                });
            }
            
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
            
            // Inverser le statut d'activation
            const newStatus = !myPackage.is_active;
            await packageModel.updateActivationPackage(packageId, newStatus);
            
            res.json({
                success: true,
                message: `Package ${newStatus ? 'activé' : 'désactivé'} avec succès`,
                isActive: newStatus
            });
            
        } catch (error) {
            console.error('Erreur lors du changement d\'activation du package:', error);
            res.status(500).json({
                success: false,
                message: 'Une erreur est survenue lors du changement d\'activation de votre package.'
            });
        }
    }

    async copyPackagePost(req, res) {
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
            // Vérifier si le package est public
            if (myPackage.mode !== 'public') {
                return res.status(403).json({
                    success: false,
                    message: 'Ce package n\'est pas public'
                });
            }
            myPackage.user_id = req.session.user.id;
            myPackage.is_active = true;
            myPackage.mode = 'private';
            // Créer le package
            const newPackage = await packageModel.create(myPackage);
            // Récupérer les mots du package
            const words = await wordModel.findWordsByPackageId(packageId);
            // Créer les mots du package
            for (const word of words) {

                await learningModel.stockWord(newPackage, word.detail_id, 'x');
            }
            res.json({
                success: true,
                message: 'Package copié avec succès',
                packageId: newPackage.package_id
            });
        } catch (error) {
            console.error('Erreur lors de la copie du package:', error);
            res.status(500).json({
                success: false,
                message: 'Une erreur est survenue lors de la copie de votre package.'
            });
        }
    }

}

module.exports = new PackageController();