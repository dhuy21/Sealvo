const UserModel = require('../../models/users');
const WordModel = require('../../models/words');
const LearningModel = require('../../models/learning');
const LearningController = require('../LearningController');
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.USER_GMAIL,
      pass: process.env.USER_PASS,
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
                const wordsToday = await LearningModel.findWordsTodayToLearnAllPackages(user.id);
                
                // N'envoie un email que si l'utilisateur a des mots à réviser
                if (wordsToday && wordsToday.length > 0) {

                     // Récupération des données pour le template
                        const streakData = await UserModel.findStreakById(user.id);
                        
                        // Récupérer les détails complets des mots
                        let allWords = [];
                        if (wordsToday && wordsToday.length > 0) {
                            // Récupérer les détails de chaque mot
                            for (const item of wordsToday) {
                                const wordDetails = await WordModel.findById(item.detail_id);
                                if (wordDetails) {
                                    allWords.push(wordDetails);
                                }
                            }
                        }

                    const emailContent = await LearningController.generateEmail(allWords, streakData, user);
                    await this.sendEmail(user.email, emailContent);
                    console.log(`Email envoyé à ${user.email} avec ${wordsToday.length} mots à apprendre aujourd'hui.`);

                } else {
                    console.log(`Aucun mot à réviser aujourd'hui pour ${user.email}.`);
                }
            }
            
            // Send confirmation response after processing is complete
            res.status(200).json({
                success: true,
                message: 'Un email a été envoyé pour réviser vos mots'
            });
            
        } catch (error) {
            console.error('Erreur lors de l\'envoi des rappels :', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'envoi des rappels'
            });
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