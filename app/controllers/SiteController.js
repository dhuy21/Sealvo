const emailQueue = require('../queues/emailQueue');
const { encode } = require('html-entities');

class SiteController {
  index(req, res) {
    res.render('home', {
      title: 'Accueil',
      user: req.session.user,
    });
  }

  aboutme(req, res) {
    res.render('aboutme', {
      title: 'À propos de moi',
      user: req.session.user,
    });
  }

  feedback(req, res) {
    res.render('feedback', {
      title: 'Feedback',
      user: req.session.user,
    });
  }

  async feedbackPost(req, res) {
    try {
      const { type, subject, content, email } = req.body;

      if (!type || !subject || !content) {
        return res.status(400).json({
          success: false,
          message: 'Veuillez remplir tous les champs obligatoires',
        });
      }

      const feedbackContent = `<p>Type: ${encode(type)}</p>
                         <p>Sujet: ${encode(subject)}</p>
                         <p>Contenu: ${encode(content)}</p>
                         <p>Email: ${encode(email || 'Non fourni')}</p>
                         <p>Date: ${new Date()}</p>`;

      const toEmail = process.env.USER_GMAIL;
      const subjectMail = 'Nouveau feedback pour votre site';
      const emailSent = await emailQueue.enqueue({
        to: toEmail,
        content: feedbackContent,
        subject: subjectMail,
      });

      if (!emailSent) {
        return res.status(400).json({
          success: false,
          message:
            "Une erreur est survenue lors de l'envoi de votre feedback. Veuillez réessayer plus tard.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Merci pour votre feedback! Nous l'avons bien reçu.",
      });
    } catch (error) {
      console.error('Feedback error:', error);
      return res.status(500).json({
        success: false,
        message:
          "Une erreur est survenue lors de l'envoi de votre feedback. Veuillez réessayer plus tard.",
      });
    }
  }
}

module.exports = new SiteController();
