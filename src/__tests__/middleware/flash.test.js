/**
 * Unit tests: flash (setFlash, getFlash, flashToLocalsMiddleware)
 */
const { setFlash, getFlash, flashToLocalsMiddleware } = require('../../app/middleware/flash');

describe('Flash middleware (unit)', () => {
  describe('setFlash', () => {
    it('stores type and message in req.session.flashMessage', () => {
      const req = { session: {} };
      setFlash(req, 'success', 'Message saved');
      expect(req.session.flashMessage).toEqual({ type: 'success', message: 'Message saved' });
    });

    it('does nothing when req.session is missing', () => {
      const req = {};
      expect(() => setFlash(req, 'error', 'Oops')).not.toThrow();
    });
  });

  describe('getFlash', () => {
    it('returns flash and removes it from session', () => {
      const req = { session: { flashMessage: { type: 'error', message: 'Error' } } };
      const result = getFlash(req);
      expect(result).toEqual({ type: 'error', message: 'Error' });
      expect(req.session.flashMessage).toBeUndefined();
    });

    it('returns null when no flash in session', () => {
      const req = { session: {} };
      expect(getFlash(req)).toBeNull();
    });

    it('returns null when req.session is missing', () => {
      expect(getFlash({})).toBeNull();
    });
  });

  describe('flashToLocalsMiddleware', () => {
    it('sets res.locals.flashMessage from getFlash and calls next', () => {
      const req = { session: { flashMessage: { type: 'success', message: 'Done' } } };
      const res = { locals: {} };
      const next = jest.fn();
      flashToLocalsMiddleware(req, res, next);
      expect(res.locals.flashMessage).toEqual({ type: 'success', message: 'Done' });
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
