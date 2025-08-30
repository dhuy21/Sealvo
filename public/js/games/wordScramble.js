document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si nous sommes sur la page du jeu WordScramble
    // On vérifie un élément unique qui n'existe que sur cette page
    if (!document.getElementById('scrambled-word')) {
        // Nous ne sommes pas sur la page WordScramble, ne pas exécuter le script
        return;
    }
    
    // ========================================
    // MAGICAL BACKGROUND SYSTEM - VARIABLES
    // ========================================
    
    // Global variables for magical background
    let magicalBg = null;
    const maxOrbs = 14;
    const maxStars = 15;
    
    // Initialize magical background
    initMagicalBackground();
    
    // Variables du jeu
    let currentWord = null;
    let currentIndex = 0;
    let score = 0;
    let words = [];
    let correctAnswers = 0;
    let totalAttempts = 0;
    let wordsPlayed = 0;
    let timer = 200;
    let gameActive = false;
    let timerInterval = null;
    
    // Éléments DOM
    const startGameBtn = document.getElementById('start-game');
    const submitAnswerBtn = document.getElementById('submit-answer');
    const skipWordBtn = document.getElementById('skip-word');
    const playAgainBtn = document.getElementById('play-again');
    const wordInput = document.getElementById('word-input');
    const scrambledWordDisplay = document.getElementById('scrambled-word');
    const wordMeaningDisplay = document.getElementById('word-meaning');
    const resultMessage = document.getElementById('result-message');
    const currentScoreDisplay = document.getElementById('current-score');
    const timerDisplay = document.getElementById('timer');
    const finalScoreDisplay = document.getElementById('final-score');
    const wordsFoundDisplay = document.getElementById('words-found');
    const accuracyDisplay = document.getElementById('accuracy');
    const trackLevelMessage = document.getElementById('track-level-message');
    const packageId = document.getElementById('package-id').getAttribute('data-package');
    const playAgainContainer = document.getElementById('play-again-container');
    
    // Écrans de jeu
    const preGameScreen = document.querySelector('.pre-game-screen');
    const activeGameScreen = document.querySelector('.active-game-screen');
    const postGameScreen = document.querySelector('.post-game-screen');
    
    // Fonction pour démarrer le jeu
    async function startGame() {
        // Réinitialiser les variables
        score = 0;
        correctAnswers = 0;
        totalAttempts = 0;
        wordsPlayed = 0;
        gameActive = true;
        currentWord = null;
        scrambledWordDisplay.textContent = '';
        wordMeaningDisplay.textContent = '';
        skipWordBtn.disabled = true;
        timer = 0;
        timerDisplay.textContent = timer;
        loader.removeAttribute('style');
        

        // Afficher l'écran de jeu actif
        preGameScreen.classList.remove('active');
        activeGameScreen.classList.add('active');
        postGameScreen.classList.remove('active');
        
        // Focus sur l'input
        wordInput.focus();

        // Charger le premier mot
        await loadNextWord();
        
        
        // Démarrer le timer
        timer = 110+words.length*9;
        console.log('Timer set to:', timer);
        timerDisplay.textContent = timer;
        currentScoreDisplay.textContent = score;
        timerInterval = setInterval(updateTimer, 1000);
    }
    
    // Fonction pour charger le prochain mot
   async function loadNextWord() {
        try {
            // Simuler une requête à l'API pour obtenir un mot
            // Dans une vraie implémentation, vous feriez un appel fetch à votre API
            const response = await fetch(`/games/wordScramble/words?package=${packageId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            
            if (!response.ok) {
                console.error('Erreur lors du chargement du mot:', response.statusText);
                return;
            }

            const data = await response.json();

            if (data.error) {
                console.error(data.error);
                    return;
            }

            words = data.words;


            const randomIndex = Math.floor(Math.random() * words.length);
            currentIndex = randomIndex;
            const selectedWord = words[currentIndex];

            loader.setAttribute('style', 'display: none;');
            scrambledWordDisplay.textContent = selectedWord.scrambled;
            wordMeaningDisplay.textContent = selectedWord.meaning;
            wordInput.value = '';
            resultMessage.textContent = '';
            resultMessage.className = 'result-message';
                
            // Stocker le mot correct pour vérification ultérieure
            currentWord = selectedWord.word;
            
            console.log('finished');

        } catch (error) {
            console.error('Erreur lors du chargement du mot:', error);
        }
    }
    
    // Fonction pour vérifier la réponse
    function checkAnswer() {
        if (!gameActive || !currentWord) return;
        
        const answer = wordInput.value.trim();
        if (!answer) return;
        
        // Vérifier si la réponse est correcte
        if (answer.toLowerCase() === currentWord.toLowerCase()) {
                score += 10;
                correctAnswers++;
                scrambledWordDisplay.textContent = currentWord;

                resultMessage.textContent = 'Correct !';
                resultMessage.className = 'result-message correct';
                currentScoreDisplay.textContent = score;
                
                // Trigger magic burst effect
                document.dispatchEvent(new CustomEvent('correct-answer'));
        } else {
            scrambledWordDisplay.textContent = currentWord;
            resultMessage.textContent = `Incorrect !`;
            resultMessage.className = 'result-message incorrect';
        }
        skipWordBtn.disabled = false;

    }

    // Fonction pour passer un mot
    function goToNextWord() {
        if (!gameActive) return;
        
        skipWordBtn.disabled = true;
        totalAttempts++;
        wordsPlayed++;

        // Charger le prochain mot après un court délai
            let randomIndex = Math.floor(Math.random() * words.length);

            while (randomIndex === currentIndex) {
                randomIndex = Math.floor(Math.random() * words.length);
            }
            currentIndex = randomIndex;
            const selectedWord = words[currentIndex];

            scrambledWordDisplay.textContent = selectedWord.scrambled;
            wordMeaningDisplay.textContent = selectedWord.meaning;
            wordInput.value = '';
            resultMessage.textContent = '';
            resultMessage.className = 'result-message';

            // Stocker le mot correct pour vérification ultérieure
            currentWord = selectedWord.word;

            skipWordBtn.disabled = true;
    }
    
    // Fonction pour mettre à jour le timer
    function updateTimer() {
        timer--;
        timerDisplay.textContent = timer;
        
        if (timer <= 30) {
            timerDisplay.classList.add('warning');
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

        
        // Mettre à jour l'écran de fin de jeu
        finalScoreDisplay.textContent = score;
        wordsFoundDisplay.textContent = correctAnswers;
        
        const accuracy = totalAttempts > 0 ? Math.round((correctAnswers / totalAttempts) * 100) : 0;
        accuracyDisplay.textContent = `${accuracy}%`;
        
        // Check if game was completed successfully
        const minAccuracy = 80; // Must have at least 80% accuracy
        const isSuccessful = accuracy >= minAccuracy;
        
        // Track level progress
        trackLevelProgress(isSuccessful);
        
          // Afficher le message de progression de niveau
        if (trackLevelMessage) {
            if (isSuccessful) {
                trackLevelMessage.textContent = 'Excellent travail ! Progressez les autres jeux de ce niveau 😍';
                trackLevelMessage.classList.remove('level-failed');
                trackLevelMessage.classList.add('level-completed');
            } else {
                trackLevelMessage.textContent = 'Bon courage ! Réessayer ce jeu pour améliorer vos compétences 🤧' ;
                trackLevelMessage.classList.remove('level-completed');
                trackLevelMessage.classList.add('level-failed');
            }
        }

        // Enregistrer le score
        saveScore(score);
        
        // Afficher l'écran de fin de jeu
        console.log('Switching to post game screen...');
        setTimeout(() => {
            if (activeGameScreen) activeGameScreen.classList.remove('active');
            if (postGameScreen) postGameScreen.classList.add('active');
            console.log('Post game screen should now be visible');
            
            // Lancer l'animation confetti simple
            launchConfetti();
        }, 1000);
    }
    
    // Fonction pour lancer l'animation confetti avec confetti.js.org
    function launchConfetti() {
        const end = Date.now() + 15 * 1000;

        // go Buckeyes!
        const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

        (function frame() {
        confetti({
            particleCount: 2,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors,
        });

        confetti({
            particleCount: 2,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors,
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
        })();
    }

    // Fonction pour enregistrer le score
    function saveScore(score) {
        // Simuler l'enregistrement du score
        // Dans une vraie implémentation, vous feriez un appel fetch à votre API
        fetch('/games/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                game_type: 'word_scramble',
                score: score,
                details: {
                    words_played: wordsPlayed,
                    correct_answers: correctAnswers,
                    accuracy: Math.round((correctAnswers / totalAttempts) * 100)
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
        fetch(`/level-progress/track?package=${packageId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                game_type: 'word_scramble',
                completed: isSuccessful
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Progression de niveau mise à jour:', data);
            
            // If all games for this level are completed and words were updated
            if (data.level_completed && data.words_updated > 0) {
                // You could show a notification or modal here
                showNotification(`Niveau terminé! ${data.words_updated} mots sont passés au niveau ${data.to_level}`, 'success');

                playAgainContainer.innerHTML = `
                    <button id="finish-level" class="play-again-btn">
                        <i class="fa-solid fa-heart" style="color: #FFD43B;" width="40" height="40"></i> Terminé
                    </button>
                `;
                
                // Ajouter l'event listener APRÈS la création du bouton
                const finishLevelBtn = document.getElementById('finish-level');
                if (finishLevelBtn) {
                    finishLevelBtn.addEventListener('click', function() {
                        window.location.href = `/games?package=${packageId}`;
                        console.log('Finish level button clicked');
                    });
                }
            }
        })
        .catch(error => {
            console.error('Erreur lors de la mise à jour de la progression de niveau:', error);
        });
    }
    
    // Événements
    if (startGameBtn) {
        startGameBtn.addEventListener('click', async () => await startGame());
    }
    
    if (submitAnswerBtn) {
        submitAnswerBtn.addEventListener('click', checkAnswer);
    }
    
    if (skipWordBtn) {
        skipWordBtn.addEventListener('click', goToNextWord);
    }
    
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', async () => await startGame());
    }
    
    if (wordInput) {
        wordInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                checkAnswer();
            }
        });
    }

    // Fonction de test pour forcer l'affichage de l'écran de fin (pour débogage)
    window.testEndGame = function() {
        console.log('Testing end game...');
        correctAnswers = totalAttempts;
        endGame();
    };
    
    window.testFailedGame = function() {
        console.log('Testing failed game...');
        correctAnswers = 0;
        endGame();
    };
    
    // Ajouter un raccourci clavier pour tester (Ctrl+Shift+E)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'E') {
            console.log('Test end game triggered by keyboard shortcut');
            window.testEndGame();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'F') {
            console.log('Test failed game triggered by keyboard shortcut');
            window.testFailedGame();
        }
    });
    
    // ========================================
    // MAGICAL BACKGROUND SYSTEM - FUNCTIONS
    // ========================================
    
    function initMagicalBackground() {

        // Create magical background container
        magicalBg = document.createElement('div');
        magicalBg.className = 'magical-background';
        document.body.appendChild(magicalBg);

        // Create magical orbs with strategic positioning
        for (let i = 0; i < maxOrbs; i++) {
            const orb = createMagicalOrb(i);
            magicalBg.appendChild(orb);
        }
        
        // Create magical stars
        for (let i = 0; i < maxStars; i++) {
            const star = createMagicalStar();
            magicalBg.appendChild(star);
        }
        
        // Animation loop with performance throttling
        function animateBackground(currentTime) {
            // Continuous animation loop for smooth effects
            requestAnimationFrame(animateBackground);
        }
        
        // Start the animation loop
        requestAnimationFrame(animateBackground);
        
    }
    
    function createMagicalOrb(index = 0) {
        const orb = document.createElement('div');
        orb.className = 'magic-orb';
        
        // Strategic positioning to ensure coverage of entire screen
        let left, top;
        
        if (index < 6) {
            // First 8 orbs: cover corners and edges systematically
            switch(index) {
                case 0: // Top-left corner
                    left = Math.random() * 25; // 0-25%
                    top = Math.random() * 25; // 0-25%
                    break;
                case 1: // Top-right corner
                    left = 75 + Math.random() * 25; // 75-100%
                    top = Math.random() * 25; // 0-25%
                    break;
                case 2: // Bottom-left corner
                    left = Math.random() * 25; // 0-25%
                    top = 75 + Math.random() * 25; // 75-100%
                    break;
                case 3: // Bottom-right corner
                    left = 75 + Math.random() * 25; // 75-100%
                    top = 75 + Math.random() * 25; // 75-100%
                    break;
                case 4: // Top center
                    left = 35 + Math.random() * 30; // 35-65%
                    top = Math.random() * 20; // 0-20%
                    break;
                case 5: // Bottom center
                    left = 35 + Math.random() * 30; // 35-65%
                    top = 80 + Math.random() * 20; // 80-100%
                    break;
            }
        } else if (index < 12) {
            // Next 8 orbs: fill center areas
            switch(index - 8) {
                case 0: // Center
                    left = 40 + Math.random() * 20; // 40-60%
                    top = 40 + Math.random() * 20; // 40-60%
                    break;
                case 1: // Center-left
                    left = 20 + Math.random() * 25; // 20-45%
                    top = 25 + Math.random() * 50; // 25-75%
                    break;
                case 2: // Center-right
                    left = 55 + Math.random() * 25; // 55-80%
                    top = 25 + Math.random() * 50; // 25-75%
                    break;
                case 3: // Center-top
                    left = 25 + Math.random() * 50; // 25-75%
                    top = 20 + Math.random() * 25; // 20-45%
                    break;
                case 4: // Center-bottom
                    left = 25 + Math.random() * 50; // 25-75%
                    top = 55 + Math.random() * 25; // 55-80%
                    break;
                default: // Random placement for remaining orbs
                    left = Math.random() * 100;
                    top = Math.random() * 100;
                    break;
            }
        } else {
            // Remaining orbs: completely random
            left = Math.random() * 100;
            top = Math.random() * 100;
        }
        
        orb.style.left = left + '%';
        orb.style.top = top + '%';
        
        // Random size variation for more visual interest
        const size = 40 + Math.random() * 80; // Between 60px and 140px
        orb.style.width = size + 'px';
        orb.style.height = size + 'px';
        
        // Random z-index for depth effect
        orb.style.zIndex = Math.floor(Math.random() * 100); // Between -5 and 4
        
        // Random opacity for layered effect
        orb.style.opacity = 0.3 + Math.random() * 0.5; // Between 0.3 and 0.8
        
        // Random animation delay and duration
        orb.style.animationDuration = (15 + Math.random() * 25) + 's'; // Between 15s and 40s
        
        return orb;
    }
    
    function createMagicalStar() {
        const star = document.createElement('div');
        star.className = 'magic-star';
        
        // Random star symbols for variety
        const starSymbols = [ '🌟'];
        star.textContent = starSymbols[Math.floor(Math.random() * starSymbols.length)];
        
        // Random positioning across full screen
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        
        // Random size for variety
        const size = 12 + Math.random() * 12; // Between 12px and 24px
        star.style.fontSize = size + 'px';
        
        // Random z-index for depth
        star.style.zIndex = Math.floor(Math.random() * 10) - 3; // Between -3 and 6
        
        // Random opacity
        star.style.opacity = 0.3 + Math.random() * 0.7; // Between 0.3 and 1.0
        
        // Random animation delay and duration
        star.style.animationDelay = Math.random() * 8 + 's';
        star.style.animationDuration = (2 + Math.random() * 6) + 's'; // Between 2s and 8s
        
        return star;
    }
});
