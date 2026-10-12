/**
 * Unit tests: ResetPasswordController
 * Covers: forgotPasswordPost, resetPasswordPost — all validation and happy-path branches.
 * Note: Token expiry/revocation is managed by Redis TTL + DEL, not by application logic.
 */
const userModel = require('../../app/models/users');
const resetPasswordModel = require('../../app/models/resetPass');
const MailersendService = require('../../app/services/mailersend');
const emailQueue = require('../../app/queues/emailQueue');
const ResetPasswordController = require('../../app/controllers/authControllers/ResetPasswordController');
const { ValidationError, AppError } = require('../../app/errors/AppError');

jest.mock('../../app/models/users');
jest.mock('../../app/models/resetPass');
jest.mock('../../app/services/mailersend');
jest.mock('../../app/queues/emailQueue');

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('ResetPasswordController (unit)', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── forgotPasswordPost ──────────────────────────────────────
  describe('forgotPasswordPost', () => {
    it('throws ValidationError when the email is not registered', async () => {
      userModel.findByEmail.mockResolvedValue(null);
      const req = { body: { email: 'nobody@example.com' } };
      const res = mockRes();

      await expect(ResetPasswordController.forgotPasswordPost(req, res)).rejects.toThrow(
        ValidationError
      );
      expect(resetPasswordModel.createResetPasswordToken).not.toHaveBeenCalled();
    });

    it('creates token, saves to Redis, sends email, and returns 200', async () => {
      userModel.findByEmail.mockResolvedValue({ username: 'alice' });
      resetPasswordModel.createResetPasswordToken.mockReturnValue({ token: 'tok123' });
      resetPasswordModel.saveResetPasswordToken.mockResolvedValue(true);
      MailersendService.generateResetPasswordEmail.mockResolvedValue('<html>reset</html>');
      emailQueue.enqueue.mockResolvedValue(true);

      const req = { body: { email: 'alice@example.com' } };
      const res = mockRes();

      await ResetPasswordController.forgotPasswordPost(req, res);

      expect(resetPasswordModel.createResetPasswordToken).toHaveBeenCalled();
      expect(resetPasswordModel.saveResetPasswordToken).toHaveBeenCalledWith(
        'alice@example.com',
        'tok123'
      );
      expect(emailQueue.enqueue).toHaveBeenCalledWith({
        to: 'alice@example.com',
        content: '<html>reset</html>',
        subject: 'Réinitialisation de mot de passe',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('throws AppError when Redis fails to save the token', async () => {
      userModel.findByEmail.mockResolvedValue({ username: 'alice' });
      resetPasswordModel.createResetPasswordToken.mockReturnValue({ token: 'tok' });
      resetPasswordModel.saveResetPasswordToken.mockResolvedValue(false);

      const req = { body: { email: 'alice@example.com' } };
      const res = mockRes();

      await expect(ResetPasswordController.forgotPasswordPost(req, res)).rejects.toThrow(AppError);
      expect(emailQueue.enqueue).not.toHaveBeenCalled();
    });

    it('throws AppError when the email service fails to send', async () => {
      userModel.findByEmail.mockResolvedValue({ username: 'alice' });
      resetPasswordModel.createResetPasswordToken.mockReturnValue({ token: 'tok' });
      resetPasswordModel.saveResetPasswordToken.mockResolvedValue(true);
      MailersendService.generateResetPasswordEmail.mockResolvedValue('<html>reset</html>');
      emailQueue.enqueue.mockResolvedValue(false);

      const req = { body: { email: 'alice@example.com' } };
      const res = mockRes();

      await expect(ResetPasswordController.forgotPasswordPost(req, res)).rejects.toThrow(AppError);
    });
  });

  // ── resetPasswordPost ───────────────────────────────────────
  describe('resetPasswordPost', () => {
    it('throws ValidationError when token is invalid or expired (Redis returns null)', async () => {
      resetPasswordModel.findByToken.mockResolvedValue(null);
      const req = { body: { token: 'unknown', password: 'Pass1!' } };
      const res = mockRes();

      await expect(ResetPasswordController.resetPasswordPost(req, res)).rejects.toThrow(
        ValidationError
      );
    });

    it('resets password, deletes token from Redis, and returns 200', async () => {
      resetPasswordModel.findByToken.mockResolvedValue({ email: 'alice@example.com' });
      userModel.updatePassword.mockResolvedValue(undefined);
      resetPasswordModel.markTokenAsUsed.mockResolvedValue(true);

      const req = { body: { token: 'valid', password: 'NewPass123!' } };
      const res = mockRes();

      await ResetPasswordController.resetPasswordPost(req, res);

      expect(userModel.updatePassword).toHaveBeenCalledWith(
        'alice@example.com',
        expect.any(String)
      );
      expect(resetPasswordModel.markTokenAsUsed).toHaveBeenCalledWith('valid');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
