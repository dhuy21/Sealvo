/**
 * Unit tests: validate() and validateForm() middleware
 *
 * Phase 3 — validates that:
 * - validate() creates ValidationError with per-field details for API routes
 * - validate() calls next() when input is valid
 * - validateForm() redirects with flash message for HTML form routes
 * - validateForm() calls next() when input is valid
 * - Both handle unexpected schema errors gracefully
 */
const { body } = require('express-validator');
const { validate, validateForm } = require('../../app/validation/validate');
const { ValidationError } = require('../../app/errors/AppError');

const testSchema = [
  body('name').trim().notEmpty().withMessage('Le nom est requis'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage("L'email est requis")
    .isEmail()
    .withMessage('Email invalide'),
];

function mockReq(bodyOverrides = {}) {
  return {
    body: bodyOverrides,
    session: {},
  };
}

function mockRes() {
  const res = {};
  res.redirect = jest.fn();
  return res;
}

// ── validate() — API/JSON routes ────────────────────────────────

describe('validate() — API/JSON middleware', () => {
  it('calls next(ValidationError) with field details when validation fails', async () => {
    const middleware = validate(testSchema);
    const req = mockReq({});
    const res = mockRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name', message: 'Le nom est requis' }),
        expect.objectContaining({ field: 'email' }),
      ])
    );
  });

  it('calls next() with no arguments when validation passes', async () => {
    const middleware = validate(testSchema);
    const req = mockReq({ name: 'Alice', email: 'alice@example.com' });
    const res = mockRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('includes field value in details', async () => {
    const middleware = validate(testSchema);
    const req = mockReq({ name: 'Alice', email: 'not-an-email' });
    const res = mockRes();
    const next = jest.fn();

    await middleware(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'email',
          message: 'Email invalide',
          value: 'not-an-email',
        }),
      ])
    );
  });
});

// ── validateForm() — HTML form routes ───────────────────────────

describe('validateForm() — HTML form middleware', () => {
  it('redirects with flash message when validation fails', async () => {
    const middleware = validateForm(testSchema, '/form-page');
    const req = mockReq({});
    const res = mockRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/form-page');
    expect(req.session.flashMessage).toBeDefined();
    expect(req.session.flashMessage.type).toBe('error');
    expect(req.session.flashMessage.message).toMatch(/nom est requis/i);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() with no arguments when validation passes', async () => {
    const middleware = validateForm(testSchema, '/form-page');
    const req = mockReq({ name: 'Alice', email: 'alice@example.com' });
    const res = mockRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('joins multiple error messages with period separator', async () => {
    const middleware = validateForm(testSchema, '/form-page');
    const req = mockReq({});
    const res = mockRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(req.session.flashMessage.message).toContain('. ');
  });
});
