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
                
                // Store success message in session
                req.session.flashMessage = {
                    type: 'success',
                    message: 'Votre email a été vérifié avec succès'
                };
                
                return res.redirect('/login');
            } else {
                // Store error message in session
                req.session.flashMessage = {
                    type: 'error',
                    message: 'Le jeton de vérification de l\'email n\'est pas valide'
                };
                
                return res.redirect('/login');
            }
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'email :', error);
            
            // Store error message in session
            req.session.flashMessage = {
                type: 'error',
                message: 'Une erreur est survenue. Veuillez réessayer plus tard.'
            };
            
            res.redirect('/login');
        }
    }

}

module.exports = new EmailVerificationController();