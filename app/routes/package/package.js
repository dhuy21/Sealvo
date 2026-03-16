const express = require('express');
const router = express.Router();
const packageController = require('../../controllers/PackageController');
const { isAuthenticated, isAuthenticatedAPI } = require('../../middleware/auth');
const asyncHandler = require('../../middleware/asyncHandler');
const { validate } = require('../../validation/validate');
const {
  createPackageSchema,
  editPackageSchema,
  packageIdParam,
} = require('../../validation/schemas/package.schema');

router.get('/', isAuthenticated, asyncHandler(packageController.myPackages));
router.post(
  '/',
  isAuthenticatedAPI,
  validate(createPackageSchema),
  asyncHandler(packageController.createPackagePost)
);
router.post(
  '/delete/:id',
  isAuthenticatedAPI,
  validate(packageIdParam),
  asyncHandler(packageController.deletePackagePost)
);
router.put(
  '/edit/:id',
  isAuthenticatedAPI,
  validate(editPackageSchema),
  asyncHandler(packageController.editPackagePost)
);
router.put(
  '/toggle-activation/:id',
  isAuthenticatedAPI,
  validate(packageIdParam),
  asyncHandler(packageController.toggleActivationPost)
);
router.post(
  '/copy/:id',
  isAuthenticatedAPI,
  validate(packageIdParam),
  asyncHandler(packageController.copyPackagePost)
);

module.exports = router;
