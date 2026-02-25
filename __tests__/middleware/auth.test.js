/**
 * Unit tests: auth middleware (isAuthenticated, isAuthenticatedAPI)
 */
const { isAuthenticated, isAuthenticatedAPI } = require('../../app/middleware/auth');

describe('Auth middleware (unit)', () => {
  describe('isAuthenticated', () => {
    it('calls next() when req.session.user exists', () => {
      const req = { session: { user: { id: 1, username: 'test' } } };
      const res = {};
      const next = jest.fn();
      isAuthenticated(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('redirects to /login when not authenticated (no session or no user)', () => {
      const cases = [{ session: null }, { session: {} }];
      cases.forEach((sessionShape) => {
        const req = sessionShape;
        const res = { redirect: jest.fn() };
        const next = jest.fn();
        isAuthenticated(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('isAuthenticatedAPI', () => {
    it('calls next() when req.session.user exists', () => {
      const req = { session: { user: { id: 1 } } };
      const res = {};
      const next = jest.fn();
      isAuthenticatedAPI(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('returns 401 JSON when not authenticated (no session or no user)', () => {
      const cases = [{ session: null }, { session: {} }];
      const expected = { success: false, message: 'Vous devez être connecté' };
      cases.forEach((sessionShape) => {
        const req = sessionShape;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        isAuthenticatedAPI(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expected);
      });
    });
  });
});
