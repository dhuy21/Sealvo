const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { setFlash } = require('../middleware/flash');
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
      cb(new Error('Type de fichier non supporté. Utilisez des fichiers Excel (xlsx, xls)'));
    }
  },
}).single('file');

class ImportFile {
  async importWords(req, res) {
    if (!req.session.user) {
      setFlash(req, 'error', 'Vous devez être connecté pour importer des mots');
      return res.redirect('/login');
    }

    upload(req, res, async (err) => {
      try {
        if (err) throw err;
        if (!req.file) throw new Error("Aucun fichier n'a été téléchargé");

        const filePath = req.file.path;
        const packageId = req.query.package;
        const userId = req.session.user.id;

        const words = parseExcelFile(filePath);
        fs.unlinkSync(filePath);

        if (words.length === 0) {
          return res
            .status(400)
            .json({ success: false, message: 'Le fichier ne contient aucun mot valide.' });
        }

        const errors = validateWords(words);
        if (errors.length > 0) {
          return res.status(400).json({ success: false, message: formatValidationErrors(errors) });
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
      } catch (error) {
        if (req.file && req.file.path) {
          try {
            fs.unlinkSync(req.file.path);
          } catch {
            /* ignore */
          }
        }
        res.status(500).json({ success: false, message: error.message });
      }
    });
  }
}

module.exports = new ImportFile();
