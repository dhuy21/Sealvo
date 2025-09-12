const learningModel = require('../models/learning');
const userModel = require('../models/users');
const wordModel = require('../models/words');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

class LearningController {
    //generateEmailContent with handlebars
    async generateEmail(allWords, totalWords, streakData, user) {
        try {
        
            // Limiter à 5 mots maximum pour l'email
            const words = allWords.map(word => {
                // Ajouter des propriétés pour faciliter l'affichage des indicateurs de difficulté
                return {
                    ...word,
                    isLevel0: word.level === 'x' ,
                    isLevel1: word.level === '0' ,
                    isLevel2: word.level === '1' ,
                    isLevel3: word.level === '2' ,
                    isLevel4: word.level === 'v' ,
                };
            });
            
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
                baseUrl: process.env.BASE_URL 
            };
            const htmlContent = template(emailContext);
            
            return htmlContent;
        } catch (error) {
            console.error('Erreur détaillée lors de la génération du contenu de l\'email:', error);
            
        }
    }
    
    async checkAndUpdateStreak(req, res) {
        const user_id = req.session.user.id;
        if (user_id) {
            try {
                // Récupérer la date de dernière connexion
                const streak_updated_at = await userModel.getDateUpdatedStreak(user_id);
                if (!streak_updated_at || !streak_updated_at.streak_updated_at) {

                        // La date est différente, on peut mettre à jour le streak
                        const streakData = await userModel.getStreakById(user_id);
                        let currentStreak = streakData && streakData.streak ? parseInt(streakData.streak) : 0;
                        currentStreak += 1; // Incrémente la série
                        await userModel.updateStreak(user_id, currentStreak);
                        
                        // Mettre à jour la date de mise à jour de la série
                        await userModel.updateStreakUpdatedAt(user_id);
                        res.status(200).json({
                            updated: true,
                            newStreak: currentStreak,
                            message: 'Série mise à jour avec succès!'
                        });
                } else {
                
                    // Obtenir la date actuelle et la date de dernière connexion
                    const now = new Date();
                    const streakUpdatedAt = new Date(streak_updated_at.streak_updated_at);
                    
                    // Formater les dates pour comparer seulement les jours (pas l'heure)
                    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const streakUpdatedAtDate = new Date(streakUpdatedAt.getFullYear(), streakUpdatedAt.getMonth(), streakUpdatedAt.getDate());
                    
                    // Vérifier si la date de dernière connexion est différente de la date actuelle
                    if (nowDate.getTime() !== streakUpdatedAtDate.getTime()) {
                        // La date est différente, on peut mettre à jour le streak
                        const streakData = await userModel.getStreakById(user_id);
                        let currentStreak = streakData && streakData.streak ? parseInt(streakData.streak) : 0;
                        currentStreak += 1; // Incrémente la série
                        await userModel.updateStreak(user_id, currentStreak);
                        
                        // Mettre à jour la date de mise à jour de la série
                        await userModel.updateStreakUpdatedAt(user_id);
                        
                        res.status(200).json({
                            updated: true,
                            newStreak: currentStreak,
                            message: 'Série mise à jour avec succès!'
                        });
                    } else {
                        // La date est la même, on ne met pas à jour le streak
                        const streakData = await userModel.getStreakById(user_id);
                        let currentStreak = streakData && streakData.streak ? parseInt(streakData.streak) : 0;
                        
                        res.status(200).json({
                            updated: false,
                            currentStreak: currentStreak,
                            reason: 'Déjà mis à jour aujourd\'hui'
                        });
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la vérification/mise à jour du streak:', error);
                res.status(500).json({
                    updated: false,
                    message: 'Une erreur est survenue lors de la vérification/mise à jour du streak'
                });
            }
        }
    }
}

module.exports = new LearningController();