const packageModel = require('../models/packages');
const wordModel = require('../models/words');
const learningModel = require('../models/learning');
const { setFlash } = require('../middleware/flash');
const cache = require('../core/cache');
const CACHE_TTL = require('../config/cache');

class PackageController {
  async myPackages(req, res) {
    try {
      if (!req.session.user) {
        setFlash(req, 'error', 'Vous devez être connecté pour accéder à cette page');
        return res.redirect('/login');
      }
      const userId = req.session.user.id;

      let packages = await cache.get(`pkgs:user:${userId}`);
      if (!packages) {
        packages = await packageModel.findPackagesByUserId(userId);
        await cache.set(`pkgs:user:${userId}`, packages, CACHE_TTL.PACKAGES_USER);
      }

      let publicPackages = await cache.get('pkgs:shared');
      if (!publicPackages) {
        publicPackages = await packageModel.findAllPublicPackages();
        await cache.set('pkgs:shared', publicPackages, CACHE_TTL.PACKAGES_SHARED);
      }

      res.render('myPackages', {
        title: 'Mes Packages',
        user: req.session.user,
        packages: packages,
        publicPackages: publicPackages,
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des packages:', error);
      res.render('myPackages', {
        title: 'Mes Packages',
        user: req.session.user,
        error: 'Une erreur est survenue lors de la récupération de vos packages.',
      });
    }
  }

  async createPackagePost(req, res) {
    try {
      if (!req.session.user) {
        return res.status(401).json({
          success: false,
          message: 'Vous devez être connecté pour accéder à cette page',
        });
      }
      const packageData = req.body;
      packageData.user_id = req.session.user.id;
      const packageId = await packageModel.create(packageData);

      let message = 'Package créé avec succès';
      if (packageData.mode === 'public') {
        await packageModel.updateActivationPackage(packageId, false);
        message = 'Package créé avec succès. Il a été automatiquement désactivé car il est public.';
      }

      await cache.del([`pkgs:user:${req.session.user.id}`, 'pkgs:shared']);

      res.json({
        success: true,
        message: message,
        packageId: packageId,
      });
    } catch (error) {
      console.error('Erreur lors de la création du package:', error);
      res.status(500).json({
        success: false,
        message: 'Une erreur est survenue lors de la création de votre package.',
      });
    }
  }

  async deletePackagePost(req, res) {
    try {
      if (!req.session.user) {
        return res.status(401).json({
          success: false,
          message: 'Vous devez être connecté pour accéder à cette page',
        });
      }
      const packageId = req.params.id;
      const myPackage = await packageModel.findPackageById(packageId);
      if (!myPackage) {
        return res.status(404).json({
          success: false,
          message: 'Package non trouvé',
        });
      }
      if (myPackage.user_id !== req.session.user.id) {
        return res.status(403).json({
          success: false,
          message: "Vous n'êtes pas autorisé à supprimer ce package",
        });
      }
      await packageModel.deletePackage(packageId);
      await cache.del([
        `pkgs:user:${req.session.user.id}`,
        'pkgs:shared',
        `dashboard:${req.session.user.id}`,
      ]);

      res.json({
        success: true,
        message: 'Package supprimé avec succès',
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du package:', error);
      res.status(500).json({
        success: false,
        message: 'Une erreur est survenue lors de la suppression de votre package.',
      });
    }
  }

  async editPackagePost(req, res) {
    try {
      if (!req.session.user) {
        return res.status(401).json({
          success: false,
          message: 'Vous devez être connecté pour accéder à cette page',
        });
      }
      const packageId = req.params.id;
      const myPackage = await packageModel.findPackageById(packageId);
      if (!myPackage) {
        return res.status(404).json({
          success: false,
          message: 'Package non trouvé',
        });
      }
      if (myPackage.user_id !== req.session.user.id) {
        return res.status(403).json({
          success: false,
          message: "Vous n'êtes pas autorisé à modifier ce package",
        });
      }
      const packageData = req.body;
      await packageModel.updateInfoPackage(packageData, packageId);

      let message = 'Package modifié avec succès';
      if (packageData.mode) {
        await packageModel.updateModePackage(packageId, packageData.mode);

        // Si le package devient public, le désactiver automatiquement pour la sécurité
        if (packageData.mode === 'public') {
          await packageModel.updateActivationPackage(packageId, false);
          message =
            'Package modifié avec succès. Il a été automatiquement désactivé car il est maintenant public.';
        }
      }

      await cache.del([`pkgs:user:${req.session.user.id}`, 'pkgs:shared']);

      res.json({
        success: true,
        message: message,
      });
    } catch (error) {
      console.error('Erreur lors de la modification du package:', error);
      res.status(500).json({
        success: false,
        message: 'Une erreur est survenue lors de la modification de votre package.',
      });
    }
  }

  async toggleActivationPost(req, res) {
    try {
      if (!req.session.user) {
        return res.status(401).json({
          success: false,
          message: 'Vous devez être connecté pour accéder à cette page',
        });
      }

      const packageId = req.params.id;

      const myPackage = await packageModel.findPackageById(packageId);
      if (!myPackage) {
        return res.status(404).json({
          success: false,
          message: 'Package non trouvé',
        });
      }

      if (myPackage.user_id !== req.session.user.id) {
        return res.status(403).json({
          success: false,
          message: "Vous n'êtes pas autorisé à modifier ce package",
        });
      }

      const newStatus = !myPackage.is_active;
      await packageModel.updateActivationPackage(packageId, newStatus);

      // Activation toggle affects packagesToReview in dashboard
      await cache.del([
        `pkgs:user:${req.session.user.id}`,
        'pkgs:shared',
        `dashboard:${req.session.user.id}`,
      ]);

      res.json({
        success: true,
        message: `Package ${newStatus ? 'activé' : 'désactivé'} avec succès`,
        isActive: newStatus,
      });
    } catch (error) {
      console.error("Erreur lors du changement d'activation du package:", error);
      res.status(500).json({
        success: false,
        message: "Une erreur est survenue lors du changement d'activation de votre package.",
      });
    }
  }

  async copyPackagePost(req, res) {
    try {
      if (!req.session.user) {
        return res.status(401).json({
          success: false,
          message: 'Vous devez être connecté pour accéder à cette page',
        });
      }
      const packageId = req.params.id;
      const myPackage = await packageModel.findPackageById(packageId);
      if (!myPackage) {
        return res.status(404).json({
          success: false,
          message: 'Package non trouvé',
        });
      }
      if (myPackage.mode !== 'public') {
        return res.status(403).json({
          success: false,
          message: "Ce package n'est pas public",
        });
      }
      myPackage.user_id = req.session.user.id;
      myPackage.is_active = true;
      myPackage.mode = 'private';
      const newPackage = await packageModel.create(myPackage);
      const words = await wordModel.findWordsByPackageId(packageId);
      for (const word of words) {
        await learningModel.stockWord(newPackage, word.detail_id, 'x');
      }
      await cache.del([
        `pkgs:user:${req.session.user.id}`,
        'pkgs:shared',
        `dashboard:${req.session.user.id}`,
      ]);

      res.json({
        success: true,
        message: 'Package copié avec succès',
        packageId: newPackage.package_id,
      });
    } catch (error) {
      console.error('Erreur lors de la copie du package:', error);
      res.status(500).json({
        success: false,
        message: 'Une erreur est survenue lors de la copie de votre package.',
      });
    }
  }
}

module.exports = new PackageController();
