const userModel = require('../models/users');

class LearningController {
    
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