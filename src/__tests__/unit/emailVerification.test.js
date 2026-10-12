/**
 * Unit tests: EmailVerificationController
 * Covers: verifyEmail — valid token, invalid token, DB error.
 */
const emailVerificationModel = require('../../app/models/email_verification');
const userModel = require('../../app/models/users');
const EmailVerificationController = require('../../app/controllers/authControllers/EmailVerificationController');

jest.mock('../../app/models/email_verification');
jest.mock('../../app/models/users');

const makeReq = (token) => ({
  params: { token },
  session: {},
});

const makeRes = () => ({ redirect: jest.fn() });

describe('EmailVerificationController (unit)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('verifyEmail', () => {
    it('verifies user and redirects to /login on valid token', async () => {
      emailVerificationModel.verifyToken.mockResolvedValue({ user_id: 42 });
      emailVerificationModel.markTokenAsUsed.mockResolvedValue(undefined);
      userModel.updateUserVerified.mockResolvedValue(undefined);

      const req = makeReq('valid-token-abc');
      const res = makeRes();

      await EmailVerificationController.verifyEmail(req, res);

      expect(emailVerificationModel.verifyToken).toHaveBeenCalledWith('valid-token-abc');
      expect(emailVerificationModel.markTokenAsUsed).toHaveBeenCalledWith('valid-token-abc');
      expect(userModel.updateUserVerified).toHaveBeenCalledWith(42);
      expect(req.session.flashMessage).toMatchObject({ type: 'success' });
      expect(res.redirect).toHaveBeenCalledWith('/login');
    });

    it('sets error flash and redirects when token is invalid', async () => {
      emailVerificationModel.verifyToken.mockResolvedValue(null);

      const req = makeReq('invalid-token');
      const res = makeRes();

      await EmailVerificationController.verifyEmail(req, res);

      expect(emailVerificationModel.markTokenAsUsed).not.toHaveBeenCalled();
      expect(userModel.updateUserVerified).not.toHaveBeenCalled();
      expect(req.session.flashMessage).toMatchObject({ type: 'error' });
      expect(res.redirect).toHaveBeenCalledWith('/login');
    });

    it('sets error flash and redirects on unexpected DB error', async () => {
      emailVerificationModel.verifyToken.mockRejectedValue(new Error('DB error'));

      const req = makeReq('any-token');
      const res = makeRes();

      await EmailVerificationController.verifyEmail(req, res);

      expect(req.session.flashMessage).toMatchObject({ type: 'error' });
      expect(res.redirect).toHaveBeenCalledWith('/login');
    });
  });
});
