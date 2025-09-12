const UserModel = require('../../models/users');
const WordModel = require('../../models/words');
const LearningModel = require('../../models/learning');
const LearningController = require('../LearningController');
const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

class ReminderController {

    constructor() {
        // Bind methods to preserve 'this' context
        this.reminder = this.reminder.bind(this);
        this.sendEmail = this.sendEmail.bind(this);
    }
    
    async reminder(req, res) {
        try {
            const users = await UserModel.getAllUsers();
            let emailsSent = 0;
            let emailsSkipped = 0;
            const maxEmailsPerBatch = 10; // Limitation pour éviter le spam
            
            // Préparer tous les emails avec limitation
            for (const user of users.slice(0, maxEmailsPerBatch)) {
                // Vérifie si l'utilisateur a des mots à réviser aujourd'hui
                const wordsToday = await LearningModel.findWordsTodayToLearnAllPackages(user.id);
                
                // N'envoie un email que si l'utilisateur a des mots à réviser
                if (wordsToday && wordsToday.length > 0) {
                    // Récupération des données pour le template
                    const streakData = await UserModel.findStreakById(user.id);
                    
                    // Récupérer les détails complets des mots
                    let allWords = [];
                    for (const item of wordsToday) {
                        const wordDetails = await WordModel.findById(item.detail_id);
                        if (wordDetails) {
                            allWords.push(wordDetails);
                        }
                    }

                    const emailContent = await LearningController.generateEmail(allWords, streakData, user);

                    const emailResult = await this.sendEmail(user.email, emailContent);

                    if (emailResult && !emailResult.error) {
                        emailsSent++;
                        console.log(`Email envoyé pour ${user.email} avec ${wordsToday.length} mots à réviser.`);
                    } else {
                        emailsSkipped++;
                        console.log(`Email non envoyé pour ${user.email}: ${emailResult?.error || 'Erreur inconnue'}`);
                    }
                    
                    // Délai entre les emails pour éviter le flagging spam
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    console.log(`Aucun mot à réviser aujourd'hui pour ${user.email}.`);
                }
            }
            
            if (users.length > maxEmailsPerBatch) {
                console.log(`Limitation appliquée: ${maxEmailsPerBatch} emails traités sur ${users.length} utilisateurs`);
            }

            // Send confirmation response after processing is complete
            res.status(200).json({
                success: true,
                message: `${emailsSent} emails envoyés, ${emailsSkipped} ignorés`,
                details: {
                    sent: emailsSent,
                    skipped: emailsSkipped,
                    total: users.length
                }
            });
            
        } catch (error) {
            console.error('Erreur lors de l\'envoi des rappels :', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'envoi des rappels'
            });
        }
    }

    async sendEmail(user_email, content) {
        try {
    
            const result = await resend.emails.send({
                from: 'SealVo <no-reply@notifications.sealvo.it.com>',
                to: [user_email],
                replyTo: 'support@notifications.sealvo.it.com',
                subject: 'Vos mots à réviser - SealVo',
                html: content,
            });

            console.log(result);
            return result;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email:', error);
            throw error;
        }
    }
}

module.exports = new ReminderController();