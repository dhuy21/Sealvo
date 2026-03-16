const { body } = require('express-validator');
const { VALID_LANGS } = require('../../services/wordProcessingService');

const ttsGenerateSchema = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Le texte est requis')
    .isLength({ max: 5000 })
    .withMessage('Le texte ne doit pas dépasser 5000 caractères'),
  body('language')
    .trim()
    .notEmpty()
    .withMessage('La langue est requise')
    .isIn(VALID_LANGS)
    .withMessage(`Langue invalide. Acceptées : ${VALID_LANGS.join(', ')}`),
];

const dashboardEditSchema = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Le nom d'utilisateur doit contenir entre 3 et 50 caractères"),
  body('email').optional().trim().isEmail().withMessage("Format d'email invalide").normalizeEmail(),
  body('ava')
    .optional()
    .isInt({ min: 1, max: 11 })
    .withMessage("L'avatar doit être un nombre entre 1 et 11"),
];

module.exports = {
  ttsGenerateSchema,
  dashboardEditSchema,
};
