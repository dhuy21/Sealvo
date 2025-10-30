const MailersendService = require('../services/mailersend');
require('dotenv').config();
class SiteController {

    // [GET] /
    index(req, res) {
        res.render('home', {
            title: 'Accueil',
            user: req.session.user
        });
    }

    // Page "À propos de moi"
    aboutme(req, res) {
        res.render('aboutme', {
            title: 'À propos de moi',
            user: req.session.user
        });
    }

    
    // Page "Feedback"
    feedback(req, res) {
        res.render('feedback', {
            title: 'Feedback',
            user: req.session.user,
        });
    }

    // Traiter la soumission du formulaire de feedback
    async feedbackPost(req, res) {
        try {
            const { type, subject, content, email } = req.body;
            
            // Validation de base
            if (!type || !subject || !content) {
                return res.status(400).json({
                    success: false,
                    message: 'Veuillez remplir tous les champs obligatoires'
                });
            }
            
            // Enregistrer le feedback (pour l'instant, juste un log)
            try {
                const feedbackContent = `<p>Type: ${type}</p>
                           <p>Sujet: ${subject}</p>
                           <p>Contenu: ${content}</p>
                           <p>Email: ${email || 'Non fourni'}</p>
                           <p>Date: ${new Date()}</p>`;

                const toEmail = process.env.USER_GMAIL;
                const subjectMail = "Nouveau feedback pour votre site";
                const emailSent = await MailersendService.sendEmail(toEmail, feedbackContent, subjectMail);

                if (!emailSent) {
                    return res.status(400).json({
                        success: false,
                        message: 'Une erreur est survenue lors de l\'envoi de votre feedback. Veuillez réessayer plus tard.'
                    });
                }
                
                // Rediriger avec un message de succès
                return res.status(200).json({
                    success: true,
                    message: 'Merci pour votre feedback! Nous l\'avons bien reçu.'
                });

            } catch (error) {
                console.error(`Erreur lors de l'envoi de l'e-mail à ${email}:`, error);
                return false;
            }
            
        } catch (error) {
            console.error('Erreur lors de la soumission du feedback:', error);
            return res.status(400).json({
                success: false,
                message: 'Une erreur est survenue lors de l\'envoi de votre feedback. Veuillez réessayer plus tard.'
            });
        }
    }
}

module.exports = new SiteController();