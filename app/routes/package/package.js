const express = require('express');
const router = express.Router();
const packageController = require('../../controllers/PackageController');
const { isAuthenticated, isAuthenticatedAPI } = require('../../middleware/auth');

router.get('/', isAuthenticated, packageController.myPackages);
router.post('/', isAuthenticatedAPI, packageController.createPackagePost);
router.post('/delete/:id', isAuthenticatedAPI, packageController.deletePackagePost);
router.put('/edit/:id', isAuthenticatedAPI, packageController.editPackagePost);
router.put('/toggle-activation/:id', isAuthenticatedAPI, packageController.toggleActivationPost);
router.post('/copy/:id', isAuthenticatedAPI, packageController.copyPackagePost);
module.exports = router;
