const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { ValidationError } = require('../errors/AppError');
const rabbitmq = require('../core/rabbitmq');
const jobTracker = require('../core/jobTracker');
const importQueue = require('../queues/importQueue');
const { parseExcelFile } = importQueue;
const { validateWords, formatValidationErrors, processWords } = require('./wordProcessingService');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const validFileTypes = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (validFileTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new ValidationError('Type de fichier non supporté. Utilisez des fichiers Excel (xlsx, xls)')
      );
    }
  },
});

/**
 * Express middleware: parse multipart upload and convert multer errors to ValidationError.
 */
function uploadMiddleware(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof ValidationError) return next(err);
      return next(new ValidationError(err.message));
    }
    next();
  });
}

/**
 * Controller: process the uploaded Excel file.
 * Expects req.file to be populated by uploadMiddleware.
 */
async function importWords(req, res) {
  if (!req.file) throw new ValidationError("Aucun fichier n'a été téléchargé");

  const filePath = req.file.path;
  const packageId = req.query.package;
  const userId = req.session.user.id;

  let words;
  try {
    words = parseExcelFile(filePath);
  } finally {
    try {
      fs.unlinkSync(filePath);
    } catch {
      /* ignore cleanup errors */
    }
  }

  if (words.length === 0) {
    throw new ValidationError('Le fichier ne contient aucun mot valide.');
  }

  const errors = validateWords(words);
  if (errors.length > 0) {
    throw new ValidationError(formatValidationErrors(errors));
  }

  if (rabbitmq.isReady()) {
    const job = await jobTracker.create('import', { packageId, userId });
    if (job) {
      const published = importQueue.publish({
        jobId: job.id,
        wordsData: words,
        packageId,
        userId,
      });
      if (published) {
        return res.status(202).json({
          success: true,
          jobId: job.id,
          async: true,
          message: 'Import en cours de traitement.',
        });
      }
      jobTracker.remove(job.id).catch(() => {});
    }
  }

  const result = await processWords(words, packageId, userId);

  res.status(200).json({
    success: true,
    async: false,
    message: `${result.successCount} mot(s) importé(s) avec succès. ${result.errChamps} erreur(s) de champs obligatoires.`,
  });
}

module.exports = { uploadMiddleware, importWords };
