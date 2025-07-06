const express = require('express');
const router = express.Router();
const packageController = require('../../controllers/PackageController');

router.get('/', packageController.myPackages);
router.post('/', packageController.createPackagePost);
router.post('/delete/:id', packageController.deletePackagePost);
router.put('/edit/:id', packageController.editPackagePost);
module.exports = router;