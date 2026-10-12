const { body } = require('express-validator');

const feedbackSchema = [
  body('type').trim().notEmpty().withMessage('Le type de feedback est requis'),
  body('subject').trim().notEmpty().withMessage('Le sujet est requis'),
  body('content').trim().notEmpty().withMessage('Le contenu est requis'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage("Format d'email invalide"),
];

module.exports = {
  feedbackSchema,
};
