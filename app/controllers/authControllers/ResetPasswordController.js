const userModel = require('../../models/users');
const resetPasswordModel = require('../../models/resetPass');
const MailersendService = require('../../services/mailersend');
const emailQueue = require('../../queues/emailQueue');
const bcrypt = require('bcryptjs');
const { ValidationError, NotFoundError, AppError } = require('../../errors/AppError');

class ResetPasswordController {
  forgotPassword(req, res) {
    res.render('forgotPassword', {
      title: 'Oublier le mot de passe',
    });
  }

  async forgotPasswordPost(req, res) {
    const { email } = req.body;

    const user = await userModel.findByEmail(email);
    if (!user) throw new ValidationError("Cet email n'existe pas");

    const { token, expiresAt } = await resetPasswordModel.createResetPasswordToken();
    await resetPasswordModel.saveResetPasswordToken(email, token, expiresAt);
    const emailContent = await MailersendService.generateResetPasswordEmail(user.username, token);
    const subject = 'Réinitialisation de mot de passe';

    const emailSent = await emailQueue.enqueue({ to: email, content: emailContent, subject });
    if (!emailSent) {
      throw new AppError('Une erreur est survenue. Veuillez réessayer plus tard.', 500);
    }

    return res.status(200).json({
      success: true,
      message: 'Un email a été envoyé pour réinitialiser votre mot de passe',
    });
  }

  async changePasswordPost(req, res) {
    const email = req.session.user.email;

    const user = await userModel.findByEmail(email);
    if (!user) throw new NotFoundError("Cet email n'existe pas");

    const { token, expiresAt } = await resetPasswordModel.createResetPasswordToken();
    await resetPasswordModel.saveResetPasswordToken(email, token, expiresAt);
    const emailContent = await MailersendService.generateResetPasswordEmail(user.username, token);
    const subject = 'Réinitialisation de mot de passe';
    const emailSent = await emailQueue.enqueue({ to: email, content: emailContent, subject });

    if (!emailSent) {
      throw new AppError('Une erreur est survenue. Veuillez réessayer plus tard.', 500);
    }

    res.json({
      success: true,
      message: 'Un email a été envoyé pour réinitialiser votre mot de passe',
    });
  }

  resetPassword(req, res) {
    const { token } = req.query;
    res.render('resetPassword', {
      title: 'Réinitialiser le mot de passe',
      token: token,
    });
  }

  async resetPasswordPost(req, res) {
    const { token, password } = req.body;

    const resetPassword = await resetPasswordModel.findByToken(token);
    if (!resetPassword) {
      throw new ValidationError("Le jeton de réinitialisation du mot de passe n'est pas valide");
    }
    if (resetPassword.used) {
      throw new ValidationError('Le jeton de réinitialisation du mot de passe a déjà été utilisé');
    }

    const now = new Date();
    if (new Date(resetPassword.expires_at) < now) {
      throw new ValidationError('Le jeton de réinitialisation du mot de passe a expiré');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await userModel.updatePassword(resetPassword.email, hashedPassword);
    await resetPasswordModel.markTokenAsUsed(token);

    return res.status(200).json({
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès',
    });
  }
}

module.exports = new ResetPasswordController();
