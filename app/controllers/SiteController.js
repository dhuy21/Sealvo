const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: process.env.USER_GMAIL,
      pass: process.env.USER_PASS,
    },
});
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
            error: req.query.error,
            success: req.query.success
        });
    }

    // Traiter la soumission du formulaire de feedback
    async feedbackPost(req, res) {
        try {
            const { type, subject, content, email } = req.body;
            
            // Validation de base
            if (!type || !subject || !content) {
                return res.redirect('/feedback?error=Veuillez remplir tous les champs obligatoires');
            }
            
            // Enregistrer le feedback (pour l'instant, juste un log)
            try {
                const info = await transporter.sendMail({
                    from: `VocabMaster <${email}>`, // sender address
                    to: 'huynguyen2182004@gmail.com', // list of receivers
                    subject: "Nouveau feedback pour votre site", // Subject line 
                    html: `<p>Type: ${type}</p>
                           <p>Sujet: ${subject}</p>
                           <p>Contenu: ${content}</p>
                           <p>Email: ${email || 'Non fourni'}</p>
                           <p>Date: ${new Date()}</p>`
                });
                
                console.log('Nouveau feedback reçu:', {
                    type,
                    subject,
                    content,
                    email: email || 'Non fourni',
                    userId: req.session.user ? req.session.user.id : null,
                    userName: req.session.user ? req.session.user.username : 'Anonyme',
                    date: new Date()
                });
                console.log(`Message sent to ${email}: ${info.messageId}`);
                // Rediriger avec un message de succès
                return res.redirect('/feedback?success=Merci pour votre feedback! Nous l\'avons bien reçu.');
                
                
            } catch (error) {
                console.error(`Erreur lors de l'envoi de l'e-mail à ${email}:`, error);
                return false;
            }
            
        } catch (error) {
            console.error('Erreur lors de la soumission du feedback:', error);
            return res.redirect('/feedback?error=Une erreur est survenue lors de l\'envoi de votre feedback. Veuillez réessayer plus tard.');
        }
    }
}

module.exports = new SiteController();