const express = require('express');
const router = express.Router();
const packageController = require('../../controllers/PackageController');

router.get('/', packageController.myPackages);
router.post('/', packageController.createPackagePost);
router.post('/delete/:id', packageController.deletePackagePost);
router.put('/edit/:id', packageController.editPackagePost);
router.put('/toggle-activation/:id', packageController.toggleActivationPost);
router.post('/copy/:id', packageController.copyPackagePost);
module.exports = router;