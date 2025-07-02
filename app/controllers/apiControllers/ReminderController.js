const UserModel = require('../../models/users');
const LearningModel = require('../../models/learning');
const LearningController = require('../LearningController');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: "huynguyen2182004@gmail.com",
      pass: "izhzdkulllzsozsm",
    },
});

class ReminderController {
    constructor() {
        // Bind methods to preserve 'this' context
        this.reminder = this.reminder.bind(this);
        this.sendEmail = this.sendEmail.bind(this);
    }

    async reminder(req, res) {
        try {
            const users = await UserModel.getAllUsers();
            for (const user of users) {
                // Vérifie si l'utilisateur a des mots à réviser aujourd'hui
                const wordsToday = await LearningModel.findWordsTodayToLearn(user.id);
                
                // N'envoie un email que si l'utilisateur a des mots à réviser
                if (wordsToday && wordsToday.length > 0) {
                    const emailContent = await LearningController.generateEmail(user.id);
                    await this.sendEmail(user.email, emailContent);
                    console.log(`Email envoyé à ${user.email} avec ${wordsToday.length} mots à apprendre aujourd'hui.`);
                } else {
                    console.log(`Aucun mot à réviser aujourd'hui pour ${user.email}.`);
                }
            }
            
            // Send confirmation response after processing is complete
            res.status(200).send('Cron job executed successfully');
            
        } catch (error) {
            console.error('Erreur lors de l\'envoi des rappels :', error);
            res.status(500).send('Error executing cron job');
        }
    }

    async sendEmail(email, content) {
        try {
            const info = await transporter.sendMail({
                from: '"SealVo" <huynguyen2182004@gmail.com>', // sender address
                to: email, // list of receivers
                subject: "Vos mots à réviser aujourd'hui", // Subject line 
                html: content
            });
            
            console.log(`Message sent to ${email}: ${info.messageId}`);
            return true;
        } catch (error) {
            console.error(`Erreur lors de l'envoi de l'e-mail à ${email}:`, error);
            return false;
        }
    }
   
}

module.exports = new ReminderController();