/**
 * Unit tests: inputSanitization middleware (generalSanitizationMiddleware, sanitizationRoutes)
 */
const {
  generalSanitizationMiddleware,
  sanitizationRoutes,
} = require('../../app/middleware/inputSanitization');

describe('inputSanitization (unit)', () => {
  describe('generalSanitizationMiddleware', () => {
    it('calls next() when method is GET', () => {
      const req = { method: 'GET', body: {} };
      const res = {};
      const next = jest.fn();
      generalSanitizationMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('calls next() when method is POST but body is null', () => {
      const req = { method: 'POST', body: null };
      const res = {};
      const next = jest.fn();
      generalSanitizationMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('calls sanitizer (and eventually next) when method is POST and body exists', () => {
      const req = { method: 'POST', body: { name: '  ok  ' }, query: {} };
      const res = {};
      const next = jest.fn();
      generalSanitizationMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body.name).toBe('ok');
    });
  });

  describe('sanitizationRoutes', () => {
    it('has registration path and fields', () => {
      expect(sanitizationRoutes.registration).toBeDefined();
      expect(sanitizationRoutes.registration.path).toBe('/registre');
      expect(sanitizationRoutes.registration.fields).toHaveProperty('username');
      expect(sanitizationRoutes.registration.fields).toHaveProperty('email');
    });

    it('has addWord path and expected fields', () => {
      expect(sanitizationRoutes.addWord).toBeDefined();
      expect(sanitizationRoutes.addWord.path).toBe('/monVocabs/add');
      expect(sanitizationRoutes.addWord.fields).toHaveProperty('word');
      expect(sanitizationRoutes.addWord.fields).toHaveProperty('meaning');
    });

    it('has editWord path and same fields as addWord', () => {
      expect(sanitizationRoutes.editWord).toBeDefined();
      expect(sanitizationRoutes.editWord.path).toBe('/monVocabs/edit');
      expect(sanitizationRoutes.editWord.fields).toBe(sanitizationRoutes.addWord.fields);
    });
  });
});
