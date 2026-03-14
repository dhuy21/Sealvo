const express = require('express');
const router = express.Router();
const wordController = require('../../controllers/WordController');
const { uploadMiddleware, importWords } = require('../../services/importFile');
const multer = require('multer');
const upload = multer();
const { isAuthenticated } = require('../../middleware/auth');
const asyncHandler = require('../../middleware/asyncHandler');
const { validate } = require('../../validation/validate');
const {
  addWordSchema,
  editWordSchema,
  deleteWordSchema,
  deleteAllWordsSchema,
} = require('../../validation/schemas/word.schema');

router.get('/add', isAuthenticated, validate(addWordSchema), wordController.addWord);
router.post(
  '/add',
  isAuthenticated,
  upload.none(),
  validate(addWordSchema),
  asyncHandler(wordController.addWordPost)
);

router.post('/add/import', isAuthenticated, uploadMiddleware, asyncHandler(importWords));

router.post(
  '/deleteAll',
  isAuthenticated,
  validate(deleteAllWordsSchema),
  asyncHandler(wordController.deleteAllWords)
);

router.post(
  '/delete/:id',
  isAuthenticated,
  validate(deleteWordSchema),
  asyncHandler(wordController.deleteWord)
);

router.get(
  '/edit/:id',
  isAuthenticated,
  validate(deleteWordSchema),
  asyncHandler(wordController.editWord)
);
router.post(
  '/edit/:id',
  isAuthenticated,
  validate(editWordSchema),
  asyncHandler(wordController.editWordPost)
);

router.get(
  '/learn',
  isAuthenticated,
  validate(addWordSchema),
  asyncHandler(wordController.learnVocabs)
);

router.get('/', isAuthenticated, asyncHandler(wordController.monVocabs));

module.exports = router;
