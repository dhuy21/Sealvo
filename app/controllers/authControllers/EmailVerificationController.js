const emailVerificationModel = require('../../models/email_verification');
const userModel = require('../../models/users');

class EmailVerificationController {
    
    async verifyEmail(req, res) {
        try {
            const token = req.params.token;

            const emailVerification = await emailVerificationModel.verifyToken(token);

            if (emailVerification) {
                await emailVerificationModel.markTokenAsUsed(token);
                
                await userModel.updateUserVerified(emailVerification.user_id);
                return res.status(200).json({
                    success: true,
                    message: 'Votre email a été vérifié avec succès'
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Le jeton de vérification de l\'email n\'est pas valide'
                });
            }
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'email :', error);
            res.status(500).json({
                success: false,
                message: 'Une erreur est survenue. Veuillez réessayer plus tard.'
            });
        }
    }

}

module.exports = new EmailVerificationController();