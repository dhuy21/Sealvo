document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si nous sommes sur la page du jeu WordScramble
    // On vérifie un élément unique qui n'existe que sur cette page
    if (!document.getElementById('scrambled-word')) {
        // Nous ne sommes pas sur la page WordScramble, ne pas exécuter le script
        return;
    }
    
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
    const highScoreMessage = document.getElementById('high-score-message');
    const packageId = document.getElementById('package-id').getAttribute('data-package');
    
    // Écrans de jeu
    const preGameScreen = document.querySelector('.pre-game-screen');
    const activeGameScreen = document.querySelector('.active-game-screen');
    const postGameScreen = document.querySelector('.post-game-screen');
    
    // Fonction pour démarrer le jeu
    function startGame() {
        // Réinitialiser les variables
        score = 0;
        correctAnswers = 0;
        totalAttempts = 0;
        wordsPlayed = 0;
        gameActive = true;
        currentWord = null;
        
        // Mettre à jour l'affichage
        currentScoreDisplay.textContent = score;
        timerDisplay.textContent = timer;
        
        // Charger le premier mot
        loadNextWord();
        
        // Démarrer le timer
        timerInterval = setInterval(updateTimer, 1000);
        
        // Afficher l'écran de jeu actif
        preGameScreen.classList.remove('active');
        activeGameScreen.classList.add('active');
        postGameScreen.classList.remove('active');
        
        // Focus sur l'input
        wordInput.focus();
    }
    
    // Fonction pour charger le prochain mot
    function loadNextWord() {
        // Simuler une requête à l'API pour obtenir un mot
        // Dans une vraie implémentation, vous feriez un appel fetch à votre API
        fetch(`/games/wordScramble/words?package=${packageId}`, {
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
            words = data.words;
            timer = 150+words.length*30;
            const randomIndex = Math.floor(Math.random() * words.length);
            currentIndex = randomIndex;
            const selectedWord = words[currentIndex];

            scrambledWordDisplay.textContent = selectedWord.scrambled;
            wordMeaningDisplay.textContent = selectedWord.meaning;
            wordInput.value = '';
            resultMessage.textContent = '';
            resultMessage.className = 'result-message';
            
            // Stocker le mot correct pour vérification ultérieure
            currentWord = selectedWord.word;
            return currentWord;
        })
        .catch(error => {
            console.error('Erreur lors du chargement du mot:', error);
        });
    }
    
    // Fonction pour vérifier la réponse
    function checkAnswer() {
        if (!gameActive || !currentWord) return;
        
        const answer = wordInput.value.trim();
        if (!answer) return;
        
        totalAttempts++;
        
        // Vérifier si la réponse est correcte
        if (answer.toLowerCase() === currentWord.toLowerCase()) {
                score += 10;
                correctAnswers++;
                resultMessage.textContent = 'Correct !';
                resultMessage.className = 'result-message correct';
                currentScoreDisplay.textContent = score;
        } else {
            resultMessage.textContent = `Incorrect ! La réponse était : ${currentWord}`;
            resultMessage.className = 'result-message incorrect';
        }
            
            wordsPlayed++;
            
            // Charger le prochain mot après un court délai
            setTimeout(loadNextWord, 1500);
    }
    
    // Fonction pour passer un mot
    function skipWord() {
        if (!gameActive) return;
        
        // Simuler un saut de mot

        resultMessage.textContent = `Passé ! La réponse était : ${currentWord}`;
        resultMessage.className = 'result-message skipped';
            
        wordsPlayed++;
            
        // Charger le prochain mot après un court délai
        setTimeout(() => {
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
            return currentWord;
        }, 1500);
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
        const minWordsPlayed = 10; // Must play at least 10 words
        const minAccuracy = 70; // Must have at least 70% accuracy
        const isSuccessful = wordsPlayed >= minWordsPlayed && accuracy >= minAccuracy;
        
        // Track level progress
        trackLevelProgress(isSuccessful);
        
        // Vérifier si c'est un nouveau record
        const currentHighScore = document.getElementById('game-container').dataset.highScore || 0;
        if (score > currentHighScore) {
            highScoreMessage.textContent = 'Nouveau record personnel !';
            highScoreMessage.classList.add('new-record');
        }
            
            // Enregistrer le score
            saveScore(score);
        
        // Afficher l'écran de fin de jeu
        activeGameScreen.classList.remove('active');
        postGameScreen.classList.add('active');
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
                console.log(`Niveau terminé! ${data.words_updated} mots sont passés au niveau ${data.to_level}`);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la mise à jour de la progression de niveau:', error);
        });
    }
    
    // Événements
    if (startGameBtn) {
        startGameBtn.addEventListener('click', startGame);
    }
    
    if (submitAnswerBtn) {
        submitAnswerBtn.addEventListener('click', checkAnswer);
    }
    
    if (skipWordBtn) {
        skipWordBtn.addEventListener('click', skipWord);
    }
    
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', startGame);
    }
    
    if (wordInput) {
        wordInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                checkAnswer();
            }
        });
    }
});
