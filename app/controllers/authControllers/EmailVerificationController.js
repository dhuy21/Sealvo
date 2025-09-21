const EmailVerificationModel = require('../../models/email_verification');

class EmailVerificationController {
    
    async verifyEmail(req, res) {
        try {
            const { token } = req.params;
            const emailVerification = await EmailVerificationModel.verifyToken(token);
            if (emailVerification) {
                return res.redirect('/login?success=Votre email a été vérifié avec succès');
            } else {
                return res.redirect('/login?error=Le jeton de vérification de l\'email n\'est pas valide');
            }
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'email :', error);
            res.redirect('/login?error=Une erreur est survenue. Veuillez réessayer plus tard.');
        }
    }

}

module.exports = new EmailVerificationController();