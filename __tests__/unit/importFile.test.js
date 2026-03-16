/**
 * Unit tests: importFile — Phase 2 refactoring
 *
 * Validates:
 * - uploadMiddleware converts multer errors → ValidationError
 * - uploadMiddleware passes through ValidationError from fileFilter
 * - importWords throws ValidationError for missing file, empty words, invalid words
 * - importWords cleans up temp file via try/finally
 * - importWords succeeds with sync fallback and async (rabbitmq) paths
 */
const { ValidationError } = require('../../app/errors/AppError');

jest.mock('multer', () => {
  const mockSingle = jest.fn();
  const multerInstance = { single: jest.fn(() => mockSingle) };
  const multer = jest.fn(() => multerInstance);
  multer.diskStorage = jest.fn();
  multer._mockSingle = mockSingle;
  multer._instance = multerInstance;
  return multer;
});

jest.mock('../../app/core/rabbitmq', () => ({
  isReady: jest.fn(() => false),
}));
jest.mock('../../app/core/jobTracker', () => ({
  create: jest.fn(),
  remove: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../app/queues/importQueue', () => ({
  parseExcelFile: jest.fn(),
  publish: jest.fn(),
}));
jest.mock('../../app/services/wordProcessingService', () => ({
  validateWords: jest.fn(() => []),
  formatValidationErrors: jest.fn((e) => e.join(', ')),
  processWords: jest.fn(),
}));
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

const fs = require('fs');
const rabbitmq = require('../../app/core/rabbitmq');
const jobTracker = require('../../app/core/jobTracker');
const importQueue = require('../../app/queues/importQueue');
const {
  validateWords,
  formatValidationErrors,
  processWords,
} = require('../../app/services/wordProcessingService');

const { uploadMiddleware, importWords } = require('../../app/services/importFile');

beforeEach(() => jest.clearAllMocks());

// ── uploadMiddleware ────────────────────────────────────────────

describe('uploadMiddleware', () => {
  const multer = require('multer');
  const mockSingle = multer._mockSingle;

  it('calls next() on successful upload', () => {
    mockSingle.mockImplementation((req, res, cb) => cb(null));
    const next = jest.fn();

    uploadMiddleware({}, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('passes through ValidationError from fileFilter', () => {
    const validationErr = new ValidationError('Type de fichier non supporté');
    mockSingle.mockImplementation((req, res, cb) => cb(validationErr));
    const next = jest.fn();

    uploadMiddleware({}, {}, next);

    expect(next).toHaveBeenCalledWith(validationErr);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
  });

  it('converts generic multer error to ValidationError', () => {
    const multerErr = new Error('File too large');
    mockSingle.mockImplementation((req, res, cb) => cb(multerErr));
    const next = jest.fn();

    uploadMiddleware({}, {}, next);

    const passedErr = next.mock.calls[0][0];
    expect(passedErr).toBeInstanceOf(ValidationError);
    expect(passedErr.message).toBe('File too large');
  });
});

// ── importWords ─────────────────────────────────────────────────

describe('importWords', () => {
  const mockRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  });

  it('throws ValidationError when req.file is missing', async () => {
    const req = { query: { package: '1' }, session: { user: { id: 'u1' } } };
    const res = mockRes();

    await expect(importWords(req, res)).rejects.toThrow(ValidationError);
    await expect(importWords(req, res)).rejects.toThrow(/fichier/i);
  });

  it('throws ValidationError when parsed words are empty', async () => {
    importQueue.parseExcelFile.mockReturnValue([]);
    const req = {
      file: { path: '/tmp/test.xlsx' },
      query: { package: '1' },
      session: { user: { id: 'u1' } },
    };
    const res = mockRes();

    await expect(importWords(req, res)).rejects.toThrow(ValidationError);
    await expect(importWords(req, res)).rejects.toThrow(/aucun mot/i);
  });

  it('throws ValidationError when word validation fails', async () => {
    importQueue.parseExcelFile.mockReturnValue([{ word: 'test', meaning: 'test' }]);
    validateWords.mockReturnValue(['Ligne 1: champ manquant']);
    formatValidationErrors.mockReturnValue('Ligne 1: champ manquant');

    const req = {
      file: { path: '/tmp/test.xlsx' },
      query: { package: '1' },
      session: { user: { id: 'u1' } },
    };
    const res = mockRes();

    await expect(importWords(req, res)).rejects.toThrow(ValidationError);
  });

  it('cleans up temp file even when parsing throws', async () => {
    importQueue.parseExcelFile.mockImplementation(() => {
      throw new Error('corrupt file');
    });

    const req = {
      file: { path: '/tmp/corrupt.xlsx' },
      query: { package: '1' },
      session: { user: { id: 'u1' } },
    };
    const res = mockRes();

    await expect(importWords(req, res)).rejects.toThrow('corrupt file');
    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/corrupt.xlsx');
  });

  it('succeeds with sync processing when rabbitmq is not ready', async () => {
    importQueue.parseExcelFile.mockReturnValue([{ word: 'hello', meaning: 'bonjour' }]);
    validateWords.mockReturnValue([]);
    rabbitmq.isReady.mockReturnValue(false);
    processWords.mockResolvedValue({ successCount: 1, errChamps: 0 });

    const req = {
      file: { path: '/tmp/valid.xlsx' },
      query: { package: '1' },
      session: { user: { id: 'u1' } },
    };
    const res = mockRes();

    await importWords(req, res);

    expect(processWords).toHaveBeenCalledWith([{ word: 'hello', meaning: 'bonjour' }], '1', 'u1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, async: false }));
  });

  it('succeeds with async processing when rabbitmq is ready', async () => {
    importQueue.parseExcelFile.mockReturnValue([{ word: 'hello', meaning: 'bonjour' }]);
    validateWords.mockReturnValue([]);
    rabbitmq.isReady.mockReturnValue(true);
    jobTracker.create.mockResolvedValue({ id: 'job-123' });
    importQueue.publish.mockReturnValue(true);

    const req = {
      file: { path: '/tmp/valid.xlsx' },
      query: { package: '1' },
      session: { user: { id: 'u1' } },
    };
    const res = mockRes();

    await importWords(req, res);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, async: true, jobId: 'job-123' })
    );
  });

  it('falls back to sync when publish fails', async () => {
    importQueue.parseExcelFile.mockReturnValue([{ word: 'hello', meaning: 'bonjour' }]);
    validateWords.mockReturnValue([]);
    rabbitmq.isReady.mockReturnValue(true);
    jobTracker.create.mockResolvedValue({ id: 'job-456' });
    importQueue.publish.mockReturnValue(false);
    processWords.mockResolvedValue({ successCount: 1, errChamps: 0 });

    const req = {
      file: { path: '/tmp/valid.xlsx' },
      query: { package: '1' },
      session: { user: { id: 'u1' } },
    };
    const res = mockRes();

    await importWords(req, res);

    expect(jobTracker.remove).toHaveBeenCalledWith('job-456');
    expect(processWords).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
