const learningModel = require('../models/learning');
const userModel = require('../models/users');
const wordModel = require('../models/words');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

class LearningController {
    //generateEmailContent with handlebars
    async generateEmail(user_id) {
        try {
            // Récupération des données pour le template
            const wordIds = await learningModel.findWordsTodayToLearn(user_id);
            const user = await userModel.findById(user_id);
            const streakData = await userModel.findStreakById(user_id);
            
            // Récupérer les détails complets des mots
            let allWords = [];
            if (wordIds && wordIds.length > 0) {
                // Récupérer les détails de chaque mot
                for (const item of wordIds) {
                    const wordDetails = await wordModel.findById(item.word_id);
                    if (wordDetails) {
                        allWords.push(wordDetails);
                    }
                }
            }
            // Limiter à 5 mots maximum pour l'email
            const totalWords = allWords.length;
            const words = allWords.slice(0, 5).map(word => {
                // Ajouter des propriétés pour faciliter l'affichage des indicateurs de difficulté
                return {
                    ...word,
                    isLevel0: word.level === '0' || word.level === 0,
                    isLevel1: word.level === '1' || word.level === 1,
                    isLevel2: word.level === '2' || word.level === 2,
                };
            });
            
            console.log('Données récupérées pour l\'email:');
            console.log(`- User: ${user ? user.username : 'Non trouvé'}`);
            console.log(`- Words count: ${totalWords}`);
            console.log(`- Words shown: ${words.length}`);
            console.log(`- Streak: ${streakData ? JSON.stringify(streakData) : 'Non disponible'}`);
            
            // Transformer les données de streak pour le template
            let streak = null;
            if (streakData && streakData.streak !== undefined) {
                const currentStreak = parseInt(streakData.streak) || 0;
                
                streak = {
                    currentStreak: currentStreak,
                    longestStreak: currentStreak, // En supposant que c'est le même (à remplacer par la vraie valeur si disponible)
                    isAtRisk: currentStreak > 0 && totalWords > 0, // En risque s'il y a un streak et des mots à réviser
                    isOnFire: currentStreak >= 7, // Impressionnant si 7+ jours
                    isGood: currentStreak >= 3 && currentStreak < 7 // Bon si entre 3 et 6 jours
                };
            }
            
            // Lire le modèle HTML avec vérification d'existence du fichier
            const templatePath = path.join(__dirname, '../views/mails/mail.hbs');
            
            if (!fs.existsSync(templatePath)) {
                throw new Error(`Le fichier template n'existe pas: ${templatePath}`);
            }
            
            const templateSource = fs.readFileSync(templatePath, 'utf8');
            console.log('Template chargé, longueur:', templateSource.length);
            
            // Tenter de compiler le template avec try/catch spécifique
            let template;
            try {
                template = handlebars.compile(templateSource);
                if (typeof template !== 'function') {
                    throw new Error('Le template compilé n\'est pas une fonction');
                }
            } catch (compileError) {
                console.error('Erreur lors de la compilation du template:', compileError);
                throw compileError;
            }
            
            // Créer le contenu de l'e-mail avec les données contextuelles
            const emailContext = {
                user,
                wordCount: totalWords,
                wordsShown: words.length,
                hasMoreWords: totalWords > 5,
                words: words,
                streak,
                baseUrl: process.env.BASE_URL || 'http://localhost:8080'
            };
            
            console.log('Génération du contenu HTML de l\'email...');
            const htmlContent = template(emailContext);
            
            return htmlContent;
        } catch (error) {
            console.error('Erreur détaillée lors de la génération du contenu de l\'email:', error);
            
        }
    }
}

module.exports = new LearningController();