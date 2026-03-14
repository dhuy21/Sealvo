/**
 * Unit tests: ResetPasswordController
 * Covers: forgotPasswordPost, resetPasswordPost — all validation and happy-path branches.
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

    it('creates token, sends email, and returns 200 for a valid email', async () => {
      userModel.findByEmail.mockResolvedValue({ username: 'alice' });
      resetPasswordModel.createResetPasswordToken.mockResolvedValue({
        token: 'tok123',
        expiresAt: new Date(Date.now() + 3600000),
      });
      resetPasswordModel.saveResetPasswordToken.mockResolvedValue(undefined);
      MailersendService.generateResetPasswordEmail.mockResolvedValue('<html>reset</html>');
      emailQueue.enqueue.mockResolvedValue(true);

      const req = { body: { email: 'alice@example.com' } };
      const res = mockRes();

      await ResetPasswordController.forgotPasswordPost(req, res);

      expect(resetPasswordModel.createResetPasswordToken).toHaveBeenCalled();
      expect(resetPasswordModel.saveResetPasswordToken).toHaveBeenCalledWith(
        'alice@example.com',
        'tok123',
        expect.any(Date)
      );
      expect(emailQueue.enqueue).toHaveBeenCalledWith({
        to: 'alice@example.com',
        content: '<html>reset</html>',
        subject: 'Réinitialisation de mot de passe',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('throws AppError when the email service fails to send', async () => {
      userModel.findByEmail.mockResolvedValue({ username: 'alice' });
      resetPasswordModel.createResetPasswordToken.mockResolvedValue({
        token: 'tok',
        expiresAt: new Date(),
      });
      resetPasswordModel.saveResetPasswordToken.mockResolvedValue(undefined);
      MailersendService.generateResetPasswordEmail.mockResolvedValue('<html>reset</html>');
      emailQueue.enqueue.mockResolvedValue(false);

      const req = { body: { email: 'alice@example.com' } };
      const res = mockRes();

      await expect(ResetPasswordController.forgotPasswordPost(req, res)).rejects.toThrow(AppError);
    });
  });

  // ── resetPasswordPost ───────────────────────────────────────
  // Password mismatch is now validated by resetPasswordSchema middleware (Phase 3).
  describe('resetPasswordPost', () => {
    it('throws ValidationError when token does not exist', async () => {
      resetPasswordModel.findByToken.mockResolvedValue(null);
      const req = { body: { token: 'unknown', password: 'Pass1!', confirm_password: 'Pass1!' } };
      const res = mockRes();

      await expect(ResetPasswordController.resetPasswordPost(req, res)).rejects.toThrow(
        ValidationError
      );
    });

    it('throws ValidationError when token has already been used', async () => {
      resetPasswordModel.findByToken.mockResolvedValue({
        used: true,
        expires_at: new Date(Date.now() + 3600000),
        email: 'u@e.com',
      });
      const req = { body: { token: 'used', password: 'Pass1!', confirm_password: 'Pass1!' } };
      const res = mockRes();

      await expect(ResetPasswordController.resetPasswordPost(req, res)).rejects.toThrow(
        ValidationError
      );
    });

    it('throws ValidationError when token has expired', async () => {
      resetPasswordModel.findByToken.mockResolvedValue({
        used: false,
        expires_at: new Date(Date.now() - 3600000),
        email: 'u@e.com',
      });
      const req = { body: { token: 'expired', password: 'Pass1!', confirm_password: 'Pass1!' } };
      const res = mockRes();

      await expect(ResetPasswordController.resetPasswordPost(req, res)).rejects.toThrow(
        ValidationError
      );
    });

    it('resets password and returns 200 with a valid token', async () => {
      resetPasswordModel.findByToken.mockResolvedValue({
        used: false,
        expires_at: new Date(Date.now() + 3600000),
        email: 'alice@example.com',
      });
      userModel.updatePassword.mockResolvedValue(undefined);
      resetPasswordModel.markTokenAsUsed.mockResolvedValue(undefined);

      const req = {
        body: { token: 'valid', password: 'NewPass123!', confirm_password: 'NewPass123!' },
      };
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
