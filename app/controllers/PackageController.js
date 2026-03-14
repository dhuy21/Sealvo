const packageModel = require('../models/packages');
const wordModel = require('../models/words');
const learningModel = require('../models/learning');
const { setFlash } = require('../middleware/flash');
const { NotFoundError, ForbiddenError } = require('../errors/AppError');
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
    const packageData = req.body;
    packageData.user_id = req.session.user.id;
    const packageId = await packageModel.create(packageData);

    let message = 'Package créé avec succès';
    if (packageData.mode === 'public') {
      await packageModel.updateActivationPackage(packageId, false);
      message = 'Package créé avec succès. Il a été automatiquement désactivé car il est public.';
    }

    await cache.del([`pkgs:user:${req.session.user.id}`, 'pkgs:shared']);

    res.json({ success: true, message, packageId });
  }

  async deletePackagePost(req, res) {
    const packageId = req.params.id;
    const myPackage = await packageModel.findPackageById(packageId);
    if (!myPackage) throw new NotFoundError('Package non trouvé');
    if (myPackage.user_id !== req.session.user.id) {
      throw new ForbiddenError("Vous n'êtes pas autorisé à supprimer ce package");
    }

    await packageModel.deletePackage(packageId);
    await cache.del([
      `pkgs:user:${req.session.user.id}`,
      'pkgs:shared',
      `dashboard:${req.session.user.id}`,
      `words:${packageId}`,
    ]);

    res.json({ success: true, message: 'Package supprimé avec succès' });
  }

  async editPackagePost(req, res) {
    const packageId = req.params.id;
    const myPackage = await packageModel.findPackageById(packageId);
    if (!myPackage) throw new NotFoundError('Package non trouvé');
    if (myPackage.user_id !== req.session.user.id) {
      throw new ForbiddenError("Vous n'êtes pas autorisé à modifier ce package");
    }

    const packageData = req.body;
    await packageModel.updateInfoPackage(packageData, packageId);

    let message = 'Package modifié avec succès';
    if (packageData.mode) {
      await packageModel.updateModePackage(packageId, packageData.mode);
      if (packageData.mode === 'public') {
        await packageModel.updateActivationPackage(packageId, false);
        message =
          'Package modifié avec succès. Il a été automatiquement désactivé car il est maintenant public.';
      }
    }

    await cache.del([`pkgs:user:${req.session.user.id}`, 'pkgs:shared']);

    res.json({ success: true, message });
  }

  async toggleActivationPost(req, res) {
    const packageId = req.params.id;
    const myPackage = await packageModel.findPackageById(packageId);
    if (!myPackage) throw new NotFoundError('Package non trouvé');
    if (myPackage.user_id !== req.session.user.id) {
      throw new ForbiddenError("Vous n'êtes pas autorisé à modifier ce package");
    }

    const newStatus = !myPackage.is_active;
    await packageModel.updateActivationPackage(packageId, newStatus);

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
  }

  async copyPackagePost(req, res) {
    const packageId = req.params.id;
    const myPackage = await packageModel.findPackageById(packageId);
    if (!myPackage) throw new NotFoundError('Package non trouvé');
    if (myPackage.mode !== 'public') {
      throw new ForbiddenError("Ce package n'est pas public");
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
      `words:${newPackage}`,
    ]);

    res.json({ success: true, message: 'Package copié avec succès', packageId: newPackage });
  }
}

module.exports = new PackageController();
