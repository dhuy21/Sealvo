const { body, param, query } = require('express-validator');

const VALID_GAME_TYPES_URL = [
  'wordScramble',
  'flashMatch',
  'speedVocab',
  'vocabQuiz',
  'phraseCompletion',
  'wordSearch',
  'testPronun',
];

const VALID_GAME_TYPES_DB = [
  'word_scramble',
  'flash_match',
  'speed_vocab',
  'vocab_quiz',
  'phrase_completion',
  'word_search',
  'test_pronun',
];

const VALID_LEVELS = ['x', '0', '1', '2', 'v'];

const packageQueryChain = query('package')
  .notEmpty()
  .withMessage('Le paramètre package est requis')
  .isInt()
  .withMessage('Le paramètre package doit être un entier');

const packageQuerySchema = [packageQueryChain];

const saveScoreSchema = [
  body('game_type')
    .notEmpty()
    .withMessage('Le type de jeu est requis')
    .isIn(VALID_GAME_TYPES_DB)
    .withMessage(`Type de jeu invalide. Acceptés : ${VALID_GAME_TYPES_DB.join(', ')}`),
  body('score')
    .notEmpty()
    .withMessage('Le score est requis')
    .isNumeric()
    .withMessage('Le score doit être un nombre'),
  body('details').optional().isObject().withMessage('Les détails doivent être un objet'),
];

const showGameSchema = [
  param('gameType')
    .notEmpty()
    .withMessage('Le type de jeu est requis')
    .isIn(VALID_GAME_TYPES_URL)
    .withMessage(`Type de jeu invalide. Acceptés : ${VALID_GAME_TYPES_URL.join(', ')}`),
  packageQueryChain,
];

const trackGameSchema = [
  body('game_type')
    .notEmpty()
    .withMessage('Le type de jeu est requis')
    .isIn(VALID_GAME_TYPES_DB)
    .withMessage(`Type de jeu invalide. Acceptés : ${VALID_GAME_TYPES_DB.join(', ')}`),
  body('completed')
    .notEmpty()
    .withMessage('Le statut de complétion est requis')
    .isBoolean()
    .withMessage('Le statut de complétion doit être un booléen'),
  packageQueryChain,
];

const resetLevelSchema = [
  body('level')
    .notEmpty()
    .withMessage('Le niveau est requis')
    .isIn(VALID_LEVELS)
    .withMessage(`Niveau invalide. Acceptés : ${VALID_LEVELS.join(', ')}`),
];

module.exports = {
  packageQuerySchema,
  saveScoreSchema,
  showGameSchema,
  trackGameSchema,
  resetLevelSchema,
  VALID_GAME_TYPES_URL,
  VALID_GAME_TYPES_DB,
};
