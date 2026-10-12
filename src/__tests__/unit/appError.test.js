/**
 * Unit tests: AppError class hierarchy
 */
const {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
} = require('../../app/errors/AppError');

describe('AppError hierarchy (unit)', () => {
  describe('AppError (base)', () => {
    it('sets message, statusCode, isOperational, and name', () => {
      const err = new AppError('something broke', 503);
      expect(err.message).toBe('something broke');
      expect(err.statusCode).toBe(503);
      expect(err.isOperational).toBe(true);
      expect(err.name).toBe('AppError');
      expect(err.details).toBeNull();
    });

    it('accepts optional details', () => {
      const details = { field: 'email', reason: 'invalid' };
      const err = new AppError('bad', 400, details);
      expect(err.details).toEqual(details);
    });

    it('is an instance of Error', () => {
      const err = new AppError('test', 500);
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
    });

    it('has a stack trace that does not reference the constructor', () => {
      const err = new AppError('test', 500);
      expect(err.stack).toBeDefined();
      expect(err.stack).not.toContain('new AppError');
    });
  });

  const subclasses = [
    {
      Class: ValidationError,
      name: 'ValidationError',
      statusCode: 400,
      defaultMsg: 'Données invalides',
    },
    {
      Class: UnauthorizedError,
      name: 'UnauthorizedError',
      statusCode: 401,
      defaultMsg: 'Vous devez être connecté',
    },
    { Class: ForbiddenError, name: 'ForbiddenError', statusCode: 403, defaultMsg: 'Accès refusé' },
    {
      Class: NotFoundError,
      name: 'NotFoundError',
      statusCode: 404,
      defaultMsg: 'Ressource non trouvée',
    },
    {
      Class: ConflictError,
      name: 'ConflictError',
      statusCode: 409,
      defaultMsg: 'Conflit de données',
    },
    {
      Class: TooManyRequestsError,
      name: 'TooManyRequestsError',
      statusCode: 429,
      defaultMsg: 'Trop de requêtes. Veuillez réessayer plus tard.',
    },
  ];

  describe.each(subclasses)('$name', ({ Class, name, statusCode, defaultMsg }) => {
    it(`has statusCode ${statusCode} and isOperational true`, () => {
      const err = new Class();
      expect(err.statusCode).toBe(statusCode);
      expect(err.isOperational).toBe(true);
    });

    it(`has name "${name}"`, () => {
      const err = new Class();
      expect(err.name).toBe(name);
    });

    it('uses default message when none provided', () => {
      const err = new Class();
      expect(err.message).toBe(defaultMsg);
    });

    it('accepts a custom message', () => {
      const err = new Class('custom msg');
      expect(err.message).toBe('custom msg');
    });

    it('is instanceof AppError and Error', () => {
      const err = new Class();
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('ValidationError details', () => {
    it('passes details to the base class', () => {
      const details = [{ field: 'email' }];
      const err = new ValidationError('bad input', details);
      expect(err.details).toEqual(details);
      expect(err.statusCode).toBe(400);
    });
  });
});
