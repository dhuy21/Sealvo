const UserModel = require('../../models/users');
const WordModel = require('../../models/words');
const LearningModel = require('../../models/learning');
const MailersendService = require('../../services/mailersend');
const emailQueue = require('../../queues/emailQueue');
class ReminderController {
  async testEmail(req, res) {
    try {
      const user = req.session.user;
      let message = '';

      // Vérifie si l'utilisateur a des mots à réviser aujourd'hui
      const wordsToday = await LearningModel.findWordsTodayToLearnAllPackages(user.id);

      // N'envoie un email que si l'utilisateur a des mots à réviser
      if (wordsToday && wordsToday.length > 0) {
        // Récupération des données pour le template
        const streakData = await UserModel.findStreakById(user.id);
        const wordsEmail = wordsToday.slice(0, 5);
        // Récupérer les détails complets des mots
        let allWords = [];
        for (const item of wordsEmail) {
          const wordDetails = await WordModel.findById(item.detail_id);
          if (wordDetails) {
            allWords.push(wordDetails);
          }
        }

        const emailContent = await MailersendService.generateEmail(
          allWords,
          wordsToday.length,
          streakData,
          user
        );
        const sent = await emailQueue.enqueue({
          to: user.email,
          content: emailContent,
          subject: 'Révision quotidienne - SealVo',
        });
        message = sent ? `L'email a été envoyé pour tester` : `Échec de l'envoi de l'email`;
      } else {
        message = `Aucun mot à réviser aujourd'hui`;
      }

      const success = !message.includes('Échec');
      res.status(success ? 200 : 500).json({ success, message });
    } catch (error) {
      console.error("Erreur lors de l'envoi des rappels :", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de l'envoi des rappels",
      });
    }
  }

  async reminder(req, res) {
    try {
      const users = await UserModel.getAllUsers();
      let sent = 0;
      let failed = 0;

      for (const user of users) {
        const wordsToday = await LearningModel.findWordsTodayToLearnAllPackages(user.id);

        if (wordsToday && wordsToday.length > 0) {
          const streakData = await UserModel.findStreakById(user.id);
          const wordsEmail = wordsToday.slice(0, 5);
          let allWords = [];
          for (const item of wordsEmail) {
            const wordDetails = await WordModel.findById(item.detail_id);
            if (wordDetails) {
              allWords.push(wordDetails);
            }
          }

          const emailContent = await MailersendService.generateEmail(
            allWords,
            wordsToday.length,
            streakData,
            user
          );
          const ok = await emailQueue.enqueue({
            to: user.email,
            content: emailContent,
            subject: 'Révision quotidienne - SealVo',
          });
          if (ok) {
            sent++;
          } else {
            failed++;
            console.error(`[Reminder] Failed to enqueue email for ${user.email}`);
          }
        } else if (process.env.NODE_ENV !== 'production') {
          console.log(`[Reminder] No words to review today for ${user.email}`);
        }
      }

      res.status(200).json({
        success: true,
        message: `Rappels traités : ${sent} envoyé(s), ${failed} échoué(s).`,
        sent,
        failed,
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi des rappels :", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de l'envoi des rappels",
      });
    }
  }
}

module.exports = new ReminderController();
