const userModel = require('../../models/users');
const resetPasswordModel = require('../../models/resetPass');
const MailersendService = require('../../services/mailersend');
const emailQueue = require('../../queues/emailQueue');
const bcrypt = require('bcryptjs');

class ResetPasswordController {
  forgotPassword(req, res) {
    res.render('forgotPassword', {
      title: 'Oublier le mot de passe',
    });
  }

  async forgotPasswordPost(req, res) {
    try {
      const { email } = req.body;

      const user = await userModel.findByEmail(email);

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Cet email n'existe pas",
        });
      }

      const { token, expiresAt } = await resetPasswordModel.createResetPasswordToken();
      await resetPasswordModel.saveResetPasswordToken(email, token, expiresAt);
      const emailContent = await MailersendService.generateResetPasswordEmail(user.username, token);
      const subject = 'Réinitialisation de mot de passe';

      const emailSent = await emailQueue.enqueue({ to: email, content: emailContent, subject });

      if (!emailSent) {
        return res.status(400).json({
          success: false,
          message: 'Une erreur est survenue. Veuillez réessayer plus tard.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Un email a été envoyé pour réinitialiser votre mot de passe',
      });
    } catch (error) {
      console.error(
        'Erreur lors de la soumission du formulaire pour oublier le mot de passe:',
        error
      );
      res.status(400).json({
        success: false,
        message: 'Une erreur est survenue. Veuillez réessayer plus tard.',
      });
    }
  }

  async changePasswordPost(req, res) {
    try {
      const email = req.session.user.email;

      const user = await userModel.findByEmail(email);

      if (!user) {
        return res.json({
          success: false,
          message: "Cet email n'existe pas",
        });
      }

      const { token, expiresAt } = await resetPasswordModel.createResetPasswordToken();
      await resetPasswordModel.saveResetPasswordToken(email, token, expiresAt);
      const emailContent = await MailersendService.generateResetPasswordEmail(user.username, token);
      const subject = 'Réinitialisation de mot de passe';
      const emailSent = await emailQueue.enqueue({ to: email, content: emailContent, subject });

      if (!emailSent) {
        return res.json({
          success: false,
          message: 'Une erreur est survenue. Veuillez réessayer plus tard.',
        });
      }

      res.json({
        success: true,
        message: 'Un email a été envoyé pour réinitialiser votre mot de passe',
      });
    } catch (error) {
      console.error(
        'Erreur lors de la soumission du formulaire pour oublier le mot de passe:',
        error
      );
      res.json({
        success: false,
        message: 'Une erreur est survenue. Veuillez réessayer plus tard.',
      });
    }
  }

  resetPassword(req, res) {
    const { token } = req.query;
    res.render('resetPassword', {
      title: 'Réinitialiser le mot de passe',
      token: token,
    });
  }

  async resetPasswordPost(req, res) {
    try {
      const { token, password, confirm_password } = req.body;

      if (password !== confirm_password) {
        return res.status(400).json({
          success: false,
          message: 'Les mots de passe ne correspondent pas',
        });
      }

      const resetPassword = await resetPasswordModel.findByToken(token);
      if (!resetPassword) {
        return res.status(400).json({
          success: false,
          message: "Le jeton de réinitialisation du mot de passe n'est pas valide",
        });
      }

      if (resetPassword.used) {
        return res.status(400).json({
          success: false,
          message: 'Le jeton de réinitialisation du mot de passe a déjà été utilisé',
        });
      }

      const now = new Date();
      if (new Date(resetPassword.expires_at) < now) {
        return res.status(400).json({
          success: false,
          message: 'Le jeton de réinitialisation du mot de passe a expiré',
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await userModel.updatePassword(resetPassword.email, hashedPassword);
      await resetPasswordModel.markTokenAsUsed(token);

      return res.status(200).json({
        success: true,
        message: 'Votre mot de passe a été réinitialisé avec succès',
      });
    } catch (error) {
      console.error(
        'Erreur lors de la soumission du formulaire pour réinitialiser le mot de passe:',
        error
      );
      res.status(400).json({
        success: false,
        message: 'Une erreur est survenue. Veuillez réessayer plus tard.',
      });
    }
  }
}

module.exports = new ResetPasswordController();
