const userModel = require('../../models/users');
const resetPasswordModel = require('../../models/resetPass');
const MailersendService = require('../../services/mailersend');
const bcrypt = require('bcryptjs')

class ResetPasswordController {

    // Afficher la page pour oublier le mot de passe
    forgotPassword(req, res) {
        res.render('forgotPassword', {
            title: 'Oublier le mot de passe',
            error: req.query.error,
            success: req.query.success
        });
    }

    // Traiter la soumission du formulaire pour oublier le mot de passe
    async forgotPasswordPost(req, res) {
        try {
            const { email } = req.body;
            
            // Vérifier si l'email existe dans la base de données
            const user = await userModel.findByEmail(email);
            
            if (!user) {
                return res.redirect('/login/forgotPassword?error=Cet email n\'existe pas');
            }

            // Créer un jeton de réinitialisation du mot de passe
            const { token, expiresAt } = await resetPasswordModel.createResetPasswordToken();

            // Enregistrer le jeton dans la base de données
            await resetPasswordModel.saveResetPasswordToken(email, token, expiresAt);

            // Envoyer le jeton par email
            const emailContent = await MailersendService.generateResetPasswordEmail(user.username, token);
            const subject = "Réinitialisation de mot de passe";

            const emailSent = await MailersendService.sendEmail(email, emailContent, subject);

            if (!emailSent) {
                return res.redirect('/login/forgotPassword?error=Une erreur est survenue. Veuillez réessayer plus tard.');
            }   

            return res.redirect('/login/forgotPassword?success=Un email a été envoyé pour réinitialiser votre mot de passe');
        } catch (error) {
            console.error('Erreur lors de la soumission du formulaire pour oublier le mot de passe:', error);
            res.redirect('/login/forgotPassword?error=Une erreur est survenue. Veuillez réessayer plus tard.');
        }
    }
    
    async changePasswordPost(req, res) {
        try {
            const email = req.session.user.email;
            
            // Vérifier si l'email existe dans la base de données
            const user = await userModel.findByEmail(email);
            
            if (!user) {
                return res.json({
                    success: false,
                    message: 'Cet email n\'existe pas'
                });
            }

            // Créer un jeton de réinitialisation du mot de passe
            const { token, expiresAt } = await resetPasswordModel.createResetPasswordToken();

            // Enregistrer le jeton dans la base de données
            await resetPasswordModel.saveResetPasswordToken(email, token, expiresAt);

            // Envoyer le jeton par email
            const emailContent = await MailersendService.generateResetPasswordEmail(user.username, token);
            const subject = "Réinitialisation de mot de passe";
            const emailSent = await MailersendService.sendEmail(email, emailContent, subject);

            if (!emailSent) {
                return res.json({
                    success: false,
                    message: 'Une erreur est survenue. Veuillez réessayer plus tard.'
                });
            }

            res.json({
                success: true,
                message: 'Un email a été envoyé pour réinitialiser votre mot de passe'
            });
        } catch (error) {
            console.error('Erreur lors de la soumission du formulaire pour oublier le mot de passe:', error);
            res.json({
                success: false,
                message: 'Une erreur est survenue. Veuillez réessayer plus tard.'
            });
        }

    }
    // Afficher la page pour réinitialiser le mot de passe
    resetPassword(req, res) {
        const { token } = req.query;
        res.render('resetPassword', {
            title: 'Réinitialiser le mot de passe',
            token: token,
            error: req.query.error,
            success: req.query.success
        });
    }

    // Traiter la soumission du formulaire pour réinitialiser le mot de passe
    async resetPasswordPost(req, res) {
        try {
            const { token, password, confirm_password } = req.body;

            // Vérifier si les mots de passe correspondent
            if (password !== confirm_password) {
                return res.redirect(`/login/resetPassword?token=${token}&error=Les mots de passe ne correspondent pas`);
            }

            // Vérifier si le jeton est valide
            const resetPassword = await resetPasswordModel.findByToken(token);
            if (!resetPassword) {
                return res.redirect('/login/resetPassword?error=Le jeton de réinitialisation du mot de passe n\'est pas valide');
            }

            // Vérifier si le jeton a été utilisé
            if (resetPassword.used) {
                return res.redirect('/login/resetPassword?error=Le jeton de réinitialisation du mot de passe a déjà été utilisé');
            }

            // Vérifier si le jeton a expiré
            const now = new Date();
            if (new Date(resetPassword.expires_at) < now) {
                return res.redirect('/login/resetPassword?error=Le jeton de réinitialisation du mot de passe a expiré');
            }
            // Hacher le mot de passe
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            // Mettre à jour le mot de passe
            await userModel.updatePassword(resetPassword.email, hashedPassword);

            // Marquer le jeton comme utilisé
            await resetPasswordModel.markTokenAsUsed(token);

            return res.redirect('/login?success=Votre mot de passe a été réinitialisé avec succès');

        } catch (error) {
            console.error('Erreur lors de la soumission du formulaire pour réinitialiser le mot de passe:', error);
            res.redirect('/login/resetPassword?error=Une erreur est survenue. Veuillez réessayer plus tard.');
        }
    }
}

module.exports = new ResetPasswordController();