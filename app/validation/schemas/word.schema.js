const { body, param, query } = require('express-validator');
const { VALID_LANGS, VALID_TYPES } = require('../../services/wordProcessingService');

const packageQuery = query('package')
  .notEmpty()
  .withMessage('Le paramètre package est requis')
  .isInt()
  .withMessage('Le paramètre package doit être un entier');

const wordIdParam = param('id')
  .notEmpty()
  .withMessage("L'identifiant du mot est requis")
  .isInt()
  .withMessage("L'identifiant du mot doit être un entier");

const addWordSchema = [packageQuery];

const editWordSchema = [
  wordIdParam,
  packageQuery,
  body('word').trim().notEmpty().withMessage('Le mot est requis'),
  body('language_code')
    .trim()
    .notEmpty()
    .withMessage('La langue est requise')
    .isIn(VALID_LANGS)
    .withMessage(`Langue invalide. Acceptées : ${VALID_LANGS.join(', ')}`),
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Le type est requis')
    .isIn(VALID_TYPES)
    .withMessage(`Type invalide. Acceptés : ${VALID_TYPES.join(', ')}`),
  body('meaning').trim().notEmpty().withMessage('La signification est requise'),
  body('example').trim().notEmpty().withMessage("L'exemple est requis"),
];

const deleteWordSchema = [wordIdParam, packageQuery];

const deleteAllWordsSchema = [packageQuery];

module.exports = {
  addWordSchema,
  editWordSchema,
  deleteWordSchema,
  deleteAllWordsSchema,
};
