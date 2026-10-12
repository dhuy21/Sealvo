const { body, param } = require('express-validator');

const VALID_MODES = ['private', 'public'];

const packageIdParam = [
  param('id')
    .notEmpty()
    .withMessage("L'identifiant du package est requis")
    .isInt()
    .withMessage("L'identifiant du package doit être un entier"),
];

const createPackageSchema = [
  body('package_name')
    .trim()
    .notEmpty()
    .withMessage('Le nom du package est requis')
    .isLength({ max: 100 })
    .withMessage('Le nom du package ne doit pas dépasser 100 caractères'),
  body('package_description').optional().trim(),
  body('mode')
    .optional()
    .isIn(VALID_MODES)
    .withMessage(`Mode invalide. Acceptés : ${VALID_MODES.join(', ')}`),
];

const editPackageSchema = [
  ...packageIdParam,
  body('package_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Le nom du package ne doit pas dépasser 100 caractères'),
  body('package_description').optional().trim(),
  body('mode')
    .optional()
    .isIn(VALID_MODES)
    .withMessage(`Mode invalide. Acceptés : ${VALID_MODES.join(', ')}`),
];

module.exports = {
  packageIdParam,
  createPackageSchema,
  editPackageSchema,
};
