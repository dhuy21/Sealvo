const { body } = require('express-validator');

const loginSchema = [
  body('username').trim().notEmpty().withMessage("Le nom d'utilisateur est requis"),
  body('password').notEmpty().withMessage('Le mot de passe est requis'),
];

const registreSchema = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage("Le nom d'utilisateur est requis")
    .isLength({ min: 3, max: 50 })
    .withMessage("Le nom d'utilisateur doit contenir entre 3 et 50 caractères"),
  body('email')
    .trim()
    .notEmpty()
    .withMessage("L'adresse email est requise")
    .isEmail()
    .withMessage("Format d'email invalide")
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est requis')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('password2')
    .notEmpty()
    .withMessage('La confirmation du mot de passe est requise')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Les mots de passe ne correspondent pas');
      }
      return true;
    }),
  body('avatar')
    .optional()
    .customSanitizer((value) => {
      const num = parseInt(String(value).replace(/\D/g, ''), 10);
      return num >= 1 && num <= 11 ? num : 1;
    }),
];

const forgotPasswordSchema = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage("L'adresse email est requise")
    .isEmail()
    .withMessage("Format d'email invalide")
    .normalizeEmail(),
];

const resetPasswordSchema = [
  body('token').trim().notEmpty().withMessage('Le jeton de réinitialisation est requis'),
  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est requis')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('confirm_password')
    .notEmpty()
    .withMessage('La confirmation du mot de passe est requise')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Les mots de passe ne correspondent pas');
      }
      return true;
    }),
];

module.exports = {
  loginSchema,
  registreSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
