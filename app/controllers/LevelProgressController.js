const wordModel = require('../models/words');
const learningModel = require('../models/learning');

class LevelProgressController {
    constructor() {
        // Bind methods to maintain 'this' context
        this.trackGameCompletion = this.trackGameCompletion.bind(this);
        this.getLevelProgress = this.getLevelProgress.bind(this);
        this.resetLevelProgress = this.resetLevelProgress.bind(this);
    }
    
    /**
     * Track game completion for a specific level
     */
    async trackGameCompletion(req, res) {
        try {
            // Verify authentication
            if (!req.session.user) {
                return res.status(401).json({ success: false, message: 'Vous devez être connecté' });
            }
            
            const { game_type, completed } = req.body;
            
            if (!game_type || completed === undefined) {
                return res.status(400).json({ success: false, message: 'Paramètres manquants' });
            }
            
            // Define which level each game is for
            const gameLevel = {
                'flash_match': 'x',
                'vocab_quiz': 'x',
                'word_scramble': '0',
                'phrase_completion': '0',
                'speed_vocab': '1',
                'word_search': '2'
            };
            
            // Required games for each level
            const levelGames = {
                'x': ['flash_match', 'vocab_quiz'],
                '0': ['word_scramble', 'phrase_completion'],
                '1': ['speed_vocab'],
                '2': ['word_search']
            };
            
            // Get the level for this game
            const currentLevel = gameLevel[game_type];
            if (!currentLevel) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Type de jeu non reconnu'
                });
            }
            
            // If game is completed, update user's progress
            if (completed) {
                // Get the current progress for this level
                const progress = await this.getUserLevelProgress(req.session.user.id);
                
                // Mark this game as completed
                if (!progress[currentLevel]) {
                    progress[currentLevel] = {};
                }
                progress[currentLevel][game_type] = true;
                
                // Save the updated progress
                await this.saveUserLevelProgress(req.session.user.id, progress);
                
                // Check if all required games for this level are completed
                const requiredGames = levelGames[currentLevel];
                let allCompleted = true;
                
                for (const requiredGame of requiredGames) {
                    if (!progress[currentLevel][requiredGame]) {
                        allCompleted = false;
                        break;
                    }
                }
                
                // If all games for this level are completed, update all words at this level
                if (allCompleted) {
                    // Get all words at this level
                    const wordIds = await learningModel.findWordsByLevel(req.session.user.id, currentLevel);
                    
                    // Update each word to the next level
                    const updatedWords = [];
                    for (const wordId of wordIds) {
                        await learningModel.updateLevelWord(req.session.user.id, wordId.word_id, currentLevel);
                        updatedWords.push(wordId.word_id);
                    }
                    
                    // Reset progress for this level
                    delete progress[currentLevel];
                    await this.saveUserLevelProgress(req.session.user.id, progress);
                    
                    return res.json({
                        success: true,
                        level_completed: true,
                        words_updated: updatedWords.length,
                        from_level: currentLevel,
                        to_level: this.getNextLevel(currentLevel)
                    });
                }
                
                return res.json({
                    success: true,
                    level_completed: false,
                    game_tracked: game_type,
                    missing_games: requiredGames.filter(g => !progress[currentLevel][g]),
                    message: 'Progression enregistrée, mais tous les jeux requis ne sont pas encore terminés'
                });
            }
            
            return res.json({
                success: true,
                message: 'Jeu non terminé avec succès, progression inchangée'
            });
        } catch (error) {
            console.error('Erreur lors du suivi de la progression:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Une erreur est survenue lors du suivi de la progression' 
            });
        }
    }
    
    /**
     * Get current progress for all levels
     */
    async getLevelProgress(req, res) {
        try {
            // Verify authentication
            if (!req.session.user) {
                return res.status(401).json({ success: false, message: 'Vous devez être connecté' });
            }
            
            const progress = await this.getUserLevelProgress(req.session.user.id);
            
            return res.json({
                success: true,
                progress
            });
        } catch (error) {
            console.error('Erreur lors de la récupération de la progression:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Une erreur est survenue lors de la récupération de la progression' 
            });
        }
    }
    
    /**
     * Reset progress for a specific level
     */
    async resetLevelProgress(req, res) {
        try {
            // Verify authentication
            if (!req.session.user) {
                return res.status(401).json({ success: false, message: 'Vous devez être connecté' });
            }
            
            const { level } = req.body;
            
            if (!level) {
                return res.status(400).json({ success: false, message: 'Niveau manquant' });
            }
            
            // Get current progress
            const progress = await this.getUserLevelProgress(req.session.user.id);
            
            // Reset the specified level
            delete progress[level];
            
            // Save updated progress
            await this.saveUserLevelProgress(req.session.user.id, progress);
            
            return res.json({
                success: true,
                message: `Progression pour le niveau ${level} réinitialisée`
            });
        } catch (error) {
            console.error('Erreur lors de la réinitialisation de la progression:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Une erreur est survenue lors de la réinitialisation de la progression' 
            });
        }
    }
    
    /**
     * Helper method to get user's level progress from session
     */
    async getUserLevelProgress(userId) {
        // In a real implementation, you would store this in a database
        // For simplicity, we'll use the session
        const sessionKey = `level_progress_${userId}`;
        
        // Check if we have progress data in the session
        if (!global.levelProgress) {
            global.levelProgress = {};
        }
        
        if (!global.levelProgress[sessionKey]) {
            global.levelProgress[sessionKey] = {};
        }
        
        return global.levelProgress[sessionKey];
    }
    
    /**
     * Helper method to save user's level progress to session
     */
    async saveUserLevelProgress(userId, progress) {
        const sessionKey = `level_progress_${userId}`;
        
        if (!global.levelProgress) {
            global.levelProgress = {};
        }
        
        global.levelProgress[sessionKey] = progress;
    }
    
    /**
     * Helper method to get the next level
     */
    getNextLevel(currentLevel) {
        const levelProgression = {
            'x': '0',
            '0': '1',
            '1': '2',
            '2': 'v'
        };
        
        return levelProgression[currentLevel] || currentLevel;
    }
}

module.exports = new LevelProgressController(); 