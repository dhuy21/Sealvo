document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si nous sommes sur la page du jeu SpeedVocab
    if (!document.getElementById('speed-vocab')) {
        // Nous ne sommes pas sur la page SpeedVocab, ne pas exécuter le script
        return;
    }
    
    // Variables du jeu
    let currentWord = null;
    let previousWordId = null; // Stocke l'ID du mot précédent au lieu du mot entier
    let attemptCount = 0; // Compteur pour éviter les boucles infinies
    let score = 0;
    let timer = 150;
    let gameActive = false;
    let timerInterval = null;
    let wordsTyped = 0;
    let correctWords = 0;
    let streak = 0;
    let bestStreak = 0;
    
    // Animation variables
    let particleInterval = null;
    let speedLineInterval = null;
    let clockTickInterval = null;
    let audioContext = null;
    let intensityLevel = 1; // Increases as timer gets lower
    
    // Éléments DOM
    const startGameBtn = document.getElementById('start-game');
    const wordDisplay = document.getElementById('word-display');
    const meaningDisplay = document.getElementById('meaning-display');
    const wordInput = document.getElementById('word-input');
    const scoreDisplay = document.getElementById('score');
    const timerDisplay = document.getElementById('timer');
    const streakDisplay = document.getElementById('streak');
    const finalScoreDisplay = document.getElementById('final-score');
    const correctWordsDisplay = document.getElementById('correct-words');
    const accuracyDisplay = document.getElementById('accuracy');
    const bestStreakDisplay = document.getElementById('best-streak');
    const wpmDisplay = document.getElementById('wpm');
    const playAgainBtn = document.getElementById('play-again');
    const highScoreMessage = document.getElementById('high-score-message');
    
    // Écrans de jeu
    const preGameScreen = document.querySelector('.pre-game-screen');
    const activeGameScreen = document.querySelector('.active-game-screen');
    const postGameScreen = document.querySelector('.post-game-screen');
    const gameContainer = document.querySelector('.game-container');

    // Initialize background animations
    initializeBackgroundAnimations();
    initializeAudio();
    
    // Fonction pour initialiser les animations de fond
    function initializeBackgroundAnimations() {
        createParticleSystem();
        createSpeedLines();
    }
    
    // Fonction pour initialiser le contexte audio
    function initializeAudio() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }
    
    // Fonction pour créer le système de particules
    function createParticleSystem() {
        const particlesContainer = document.createElement('div');
        particlesContainer.className = 'particles';
        document.body.appendChild(particlesContainer);
        
        function createParticle() {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + 'vw';
            particle.style.animationDelay = Math.random() * 2 + 's';
            
            // Vary particle size based on intensity
            const size = 2 + (intensityLevel * 2);
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            
            particlesContainer.appendChild(particle);
            
            // Remove particle after animation
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 18000);
        }
        
        // Create initial particles
        for (let i = 0; i < 15; i++) {
            setTimeout(() => createParticle(), i * 200);
        }
        
        // Continue creating particles
        particleInterval = setInterval(createParticle, 800);
        
        // Make createParticle available globally for intensity updates
        window.createParticle = createParticle;
    }
    
    // Fonction pour créer les lignes de vitesse
    function createSpeedLines() {
        const speedLinesContainer = document.createElement('div');
        speedLinesContainer.className = 'speed-lines';
        activeGameScreen.appendChild(speedLinesContainer);
        
        function createSpeedLine() {
            if (!gameActive) return;
            
            const speedLine = document.createElement('div');
            speedLine.className = 'speed-line';
            speedLine.style.left = Math.random() * 100 + '%';
            speedLine.style.animationDelay = Math.random() * 0.5 + 's';
            
            // Vary speed line intensity
            const opacity = 0.3 + (intensityLevel * 0.2);
            speedLine.style.opacity = Math.min(opacity, 1);
            
            speedLinesContainer.appendChild(speedLine);
            
            // Remove speed line after animation
            setTimeout(() => {
                if (speedLine.parentNode) {
                    speedLine.parentNode.removeChild(speedLine);
                }
            }, 2000);
        }
        
        speedLineInterval = setInterval(createSpeedLine, 300);
        
        // Make createSpeedLine available globally for intensity updates
        window.createSpeedLine = createSpeedLine;
    }
    
    // Fonction pour créer un effet de ripple
    function createRippleEffect(element, isCorrect = true) {
        const ripple = document.createElement('div');
        ripple.className = isCorrect ? 'correct-ripple' : 'incorrect-ripple';
        element.style.position = 'relative';
        element.appendChild(ripple);
        
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }
    
    // Fonction pour ajouter l'animation énergétique au conteneur de mot
    function addWordEnergyAnimation() {
        const wordContainer = document.querySelector('.word-container');
        wordContainer.classList.add('energetic');
        setTimeout(() => {
            wordContainer.classList.remove('energetic');
        }, 500);
    }
    
    // Fonction pour l'animation de célébration de série
    function celebrateStreak() {
        streakDisplay.parentElement.classList.add('streak-celebration');
        setTimeout(() => {
            streakDisplay.parentElement.classList.remove('streak-celebration');
        }, 800);
    }
    
   
    
    // Fonction pour arrêter les animations
    function stopAnimations() {
        if (clockTickInterval) {
            clearInterval(clockTickInterval);
            clockTickInterval = null;
        }
        
        timerDisplay.parentElement.classList.remove('timer-active');
        activeGameScreen.classList.remove('game-active');
    }
    
    // Fonction pour démarrer le jeu
    function startGame() {
        // Réinitialiser les variables
        score = 0;
        timer = 150;
        wordsTyped = 0;
        correctWords = 0;
        streak = 0;
        bestStreak = 0;
        gameActive = true;
        
        // Mettre à jour l'affichage
        scoreDisplay.textContent = score;
        timerDisplay.textContent = timer;
        streakDisplay.textContent = streak;
        
        // Start energetic animations
        activeGameScreen.classList.add('game-active');
        
        // Charger le premier mot
        loadNewWord();
        
        // Démarrer le timer
        timerInterval = setInterval(updateTimer, 1000);
        
        // Afficher l'écran de jeu actif
        preGameScreen.classList.remove('active');
        activeGameScreen.classList.add('active');
        postGameScreen.classList.remove('active');
        
        // Focus sur l'input
        wordInput.focus();
        wordInput.value = '';
    }
    
    // Fonction pour charger un nouveau mot
    function loadNewWord() {
        // Add energy animation when loading new word
        addWordEnergyAnimation();
        
        // Réinitialiser le compteur de tentatives si c'est un nouveau chargement (pas une répétition)
        if (attemptCount === 0) {
            console.log("Chargement d'un nouveau mot...");
        } else if (attemptCount > 5) {
            // Éviter les boucles infinies si le vocabulaire est très limité
            console.log("Vocabulaire limité, acceptation du même mot après 5 tentatives");
            attemptCount = 0; // Réinitialiser pour le prochain chargement
        }
        
        // Simuler une requête à l'API pour obtenir un mot
        fetch(`/games/speedVocab/word?previous=${previousWordId || ''}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error(data.error);
                return;
            }
            
            // Vérifier si le nouveau mot est le même que le précédent
            if (previousWordId && data.word_id === previousWordId) {
                attemptCount++;
                console.log(`Mot identique au précédent (tentative ${attemptCount}), rechargement...`);
                
                // Attendre un peu avant de réessayer pour éviter les problèmes de timing
                setTimeout(() => {
                    loadNewWord(); // Relancer la fonction pour obtenir un mot différent
                }, 100);
                return;
            }
            
            // Réinitialiser le compteur de tentatives
            attemptCount = 0;
            
            // Stocker l'ID du mot actuel comme "précédent" pour la prochaine fois
            previousWordId = data.word_id;
            
            // Mettre à jour le mot courant
            currentWord = data;
            
            // Afficher le mot et sa signification
            wordDisplay.textContent = data.word;
            meaningDisplay.textContent = data.meaning || '';
            
            // Animation d'apparition du mot
            wordDisplay.classList.add('fadeIn');
            setTimeout(() => {
                wordDisplay.classList.remove('fadeIn');
            }, 500);
        })
        .catch(error => {
            console.error('Erreur lors du chargement du mot:', error);
        });
    }
    
    // Fonction pour vérifier la saisie de l'utilisateur
    function checkInput() {
        if (!gameActive || !currentWord) return;
        
        const userInput = wordInput.value.trim().toLowerCase();
        const correctWord = currentWord.word.trim().toLowerCase();
        
        // Vérifier si la saisie est correcte
        if (userInput === correctWord) {
            // Mot correct
            wordsTyped++;
            correctWords++;
            
            // Play success sound
            playSuccessSound();
            
            // Calculer les points 
            let wordPoints = 10; // Points de base
            
            // Bonus pour la longueur du mot (1 point supplémentaire par caractère au-delà de 4)
            const lengthBonus = Math.max(0, correctWord.length - 4);
            wordPoints += lengthBonus;
            
            // Bonus de série consécutive
            streak++;
            bestStreak = Math.max(bestStreak, streak);
            
            const streakBonus = Math.floor(streak / 3) * 5; // 5 points tous les 3 mots consécutifs
            wordPoints += streakBonus;
            
            // Mettre à jour le score
            score += wordPoints;
            scoreDisplay.textContent = score;
            streakDisplay.textContent = streak;
            
            // Animations de succès
            createRippleEffect(wordInput, true);
            if (streak > 0 && streak % 3 === 0) {
                celebrateStreak();
            }
            
            // Feedback visuel positif
            wordInput.classList.add('correct');
            setTimeout(() => {
                wordInput.classList.remove('correct');
            }, 500);
            
            // Charger un nouveau mot
            wordInput.value = '';
            loadNewWord();
        } else if (userInput.length >= correctWord.length) {
            // Mot incorrect
            wordsTyped++;
            streak = 0;
            streakDisplay.textContent = streak;
            
            // Play error sound
            playErrorSound();
            
            // Animations d'échec
            createRippleEffect(wordInput, false);
            wordInput.classList.add('incorrect-shake');
            
            // Screen shake for incorrect answer
            createScreenShake(1);
            
            // Feedback visuel négatif
            wordInput.classList.add('incorrect');
            setTimeout(() => {
                wordInput.classList.remove('incorrect');
                wordInput.classList.remove('incorrect-shake');
                wordInput.value = '';
                loadNewWord();
            }, 500);
        }
    }
    
    // Fonction pour mettre à jour le timer
    function updateTimer() {
        timer--;
        timerDisplay.textContent = timer;
        
        // Update intensity based on remaining time
        updateIntensity();
        
        if (timer <= 50) {
            timerDisplay.classList.add('warning');
        }
        
        // Add extra urgency effects for very low time
        if (timer <= 10) {
            if (timer % 2 === 0) {
                createScreenShake(1);
            }
        }
        
        if (timer <= 0) {
            clearInterval(timerInterval);
            endGame();
        }
    }
    
    // Fonction pour terminer le jeu
    function endGame() {
        gameActive = false;
        clearInterval(timerInterval);
        
        // Stop all animations
        stopAnimations();
        
        // Calculer les statistiques
        const accuracy = wordsTyped > 0 ? Math.round((correctWords / wordsTyped) * 100) : 0;
        const wpm = Math.round((correctWords / 60) * 60); // Mots par minute (60 secondes au total)
        
        // Mettre à jour l'écran de fin de jeu
        finalScoreDisplay.textContent = score;
        correctWordsDisplay.textContent = correctWords;
        accuracyDisplay.textContent = `${accuracy}%`;
        bestStreakDisplay.textContent = bestStreak;
        wpmDisplay.textContent = wpm;
        
        // Check if game was completed successfully
        const minCorrectWords = 15; // At least 15 words typed correctly
        const minAccuracy = 70; // 70% accuracy
        const isSuccessful = correctWords >= minCorrectWords && accuracy >= minAccuracy;
        
        // Track level progress
        trackLevelProgress(isSuccessful);
        
        // Vérifier si c'est un nouveau record
        const currentHighScore = document.getElementById('game-container').dataset.highScore || 0;
        if (score > currentHighScore) {
            highScoreMessage.textContent = 'Nouveau record personnel !';
            highScoreMessage.classList.add('new-record');
            
            // Enregistrer le score
            saveScore(score);
        } else {
            // Save score anyway
            saveScore(score);
        }
        
        // Afficher l'écran de fin de jeu
        activeGameScreen.classList.remove('active');
        postGameScreen.classList.add('active');
    }
    
    // Fonction pour enregistrer le score
    function saveScore(score) {
        // Envoyer le score au serveur
        fetch('/games/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                game_type: 'speed_vocab',
                score: score,
                details: {
                    words_typed: wordsTyped,
                    correct_words: correctWords,
                    accuracy: wordsTyped > 0 ? Math.round((correctWords / wordsTyped) * 100) : 0,
                    best_streak: bestStreak,
                    wpm: Math.round((correctWords / 60) * 60)
                }
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Score enregistré avec succès:', data);
        })
        .catch(error => {
            console.error('Erreur lors de l\'enregistrement du score:', error);
        });
    }
    
    // Fonction pour suivre la progression de niveau
    function trackLevelProgress(isSuccessful) {
        fetch('/level-progress/track', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                game_type: 'speed_vocab',
                completed: isSuccessful
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Progression de niveau mise à jour:', data);
            
            // If all games for this level are completed and words were updated
            if (data.level_completed && data.words_updated > 0) {
                // You could show a notification or modal here
                console.log(`Niveau terminé! ${data.words_updated} mots sont passés au niveau ${data.to_level}`);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la mise à jour de la progression de niveau:', error);
        });
    }
    
    // Fonction pour créer le son de tick
    function playTickSound() {
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    }
    
    // Fonction pour créer le son de succès
    function playSuccessSound() {
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G5
        
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    }
    
    // Fonction pour créer le son d'échec
    function playErrorSound() {
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    }
    
    // Fonction pour mettre à jour le niveau d'intensité
    function updateIntensity() {
        if (timer > 100) {
            intensityLevel = 1;
        } else if (timer > 50) {
            intensityLevel = 1.5;
        } else if (timer > 20) {
            intensityLevel = 2;
        } else {
            intensityLevel = 3;
        }
        
        // Update particle creation rate based on intensity
        if (particleInterval) {
            clearInterval(particleInterval);
            particleInterval = setInterval(createParticle, Math.max(200, 800 / intensityLevel));
        }
        
        // Update speed line creation rate
        if (speedLineInterval) {
            clearInterval(speedLineInterval);
            speedLineInterval = setInterval(createSpeedLine, Math.max(100, 300 / intensityLevel));
        }
    }
    
    // Fonction pour créer un effet d'écran secoué
    function createScreenShake(intensity = 1) {
        const gameContainer = document.querySelector('.game-container');
        gameContainer.style.animation = `screenShake 0.5s ease-in-out`;
        gameContainer.style.animationIterationCount = intensity;
        
        setTimeout(() => {
            gameContainer.style.animation = '';
        }, 500 * intensity);
        
        // Add CSS for screen shake if not exists
        if (!document.getElementById('screen-shake-style')) {
            const style = document.createElement('style');
            style.id = 'screen-shake-style';
            style.textContent = `
                @keyframes screenShake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-2px) translateY(1px); }
                    50% { transform: translateX(2px) translateY(-1px); }
                    75% { transform: translateX(-1px) translateY(2px); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Événements
    if (startGameBtn) {
        startGameBtn.addEventListener('click', startGame);
    }
    
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', startGame);
    }
    
    if (wordInput) {
        wordInput.addEventListener('input', checkInput);
    }
    
    // Empêcher la perte du focus sur l'input pendant le jeu
    document.addEventListener('click', function() {
        if (gameActive) {
            wordInput.focus();
        }
    });
});