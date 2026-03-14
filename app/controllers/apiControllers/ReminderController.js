const UserModel = require('../../models/users');
const WordModel = require('../../models/words');
const LearningModel = require('../../models/learning');
const MailersendService = require('../../services/mailersend');
const emailQueue = require('../../queues/emailQueue');
const { AppError } = require('../../errors/AppError');

class ReminderController {
  async testEmail(req, res) {
    const user = req.session.user;

    const wordsToday = await LearningModel.findWordsTodayToLearnAllPackages(user.id);

    if (!wordsToday || wordsToday.length === 0) {
      return res.status(200).json({ success: true, message: "Aucun mot à réviser aujourd'hui" });
    }

    const streakData = await UserModel.findStreakById(user.id);
    const wordsEmail = wordsToday.slice(0, 5);
    let allWords = [];
    for (const item of wordsEmail) {
      const wordDetails = await WordModel.findById(item.detail_id);
      if (wordDetails) allWords.push(wordDetails);
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

    if (!sent) throw new AppError("Échec de l'envoi de l'email", 500);

    res.status(200).json({ success: true, message: "L'email a été envoyé pour tester" });
  }

  async reminder(req, res) {
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
          if (wordDetails) allWords.push(wordDetails);
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
  }
}

module.exports = new ReminderController();
