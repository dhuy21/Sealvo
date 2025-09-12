const UserModel = require('../../models/users');
const WordModel = require('../../models/words');
const LearningModel = require('../../models/learning');
const LearningController = require('../LearningController');
const ResendService = require('../../services/resend');
class ReminderController {

    async reminder(req, res) {
        try {
            const users = await UserModel.getAllUsers();
         
            // Préparer tous les emails avec limitation
            for (const user of users) {
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

                    const emailResult = await ResendService.sendEmail(user.email, emailContent);

                    
                } else {
                    console.log(`Aucun mot à réviser aujourd'hui pour ${user.email}.`);
                }
            }

            // Send confirmation response after processing is complete
            res.status(200).json({
                success: true,
                message: `${users.length} emails envoyés`,
            });
            
        } catch (error) {
            console.error('Erreur lors de l\'envoi des rappels :', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'envoi des rappels'
            });
        }
    }
}

module.exports = new ReminderController();