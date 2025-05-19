document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si nous sommes sur la page du jeu Phrase Completion
    if (!document.getElementById('phrase-display')) {
        // Nous ne sommes pas sur la page Phrase Completion, ne pas exécuter le script
        return;
    }
    
    console.log('PhraseCompletion script initialized');
    
    // Variables du jeu
    let currentPhrase = null;
    let correctWord = null;
    let previousWordId = null;
    let score = 0;
    let timer = 300;
    let gameActive = false;
    let timerInterval = null;
    let questionsAnswered = 0;
    let correctAnswers = 0;
    let streak = 0;
    let bestStreak = 0;
    let totalQuestions = 0; // Valeur par défaut qui sera mise à jour
    let availableWords = 0; // Nombre de mots disponibles pour ce niveau
    const maxQuestions = 20; // Maximum de questions

    
    let timePerQuestion = [];
    let startQuestionTime = null;
    let attempts = 0; // nombre de tentatives sur la question actuelle
    let isLoadingPhrase = false; // Guard to prevent multiple simultaneous loadNewPhrase calls
    
    // Éléments DOM
    
    const startGameBtn = document.getElementById('start-game');
    const phraseDisplay = document.getElementById('phrase-display');
    const wordInput = document.getElementById('word-input');
    const submitBtn = document.getElementById('submit-answer');
    const wordMeaning = document.getElementById('word-meaning');
    const hintText = document.getElementById('hint-text');
    const feedbackMessage = document.getElementById('feedback-message');
    const nextPhraseBtn = document.getElementById('next-phrase-btn');
    const scoreDisplay = document.getElementById('score');
    const questionCountDisplay = document.getElementById('question-count');
    const timerDisplay = document.getElementById('timer');
    const finalScoreDisplay = document.getElementById('final-score');
    const correctAnswersDisplay = document.getElementById('correct-answers');
    const accuracyDisplay = document.getElementById('accuracy');
    const bestStreakDisplay = document.getElementById('best-streak');
    const avgTimeDisplay = document.getElementById('avg-time');
    const highScoreMessage = document.getElementById('high-score-message');
    const playAgainBtn = document.getElementById('play-again');
    
    // Écrans de jeu
    const preGameScreen = document.querySelector('.pre-game-screen');
    const activeGameScreen = document.querySelector('.active-game-screen');
    const postGameScreen = document.querySelector('.post-game-screen');
    
    
    // Fonction pour démarrer le jeu
    function startGame() {
        // Vérifier le nombre de mots disponibles
        fetch('/games/phraseCompletion/available-words', {
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
            
            // Mettre à jour le nombre total de questions en fonction des mots disponibles
            availableWords = data.count;
            totalQuestions = Math.min(availableWords, maxQuestions) ;
            totalQuestions += parseInt(0.5*availableWords); // Maximum 20 questions ou le nombre de mots disponibles
            console.log('Nombre de mots disponibles:', availableWords);
            console.log('Nombre de questions:', totalQuestions);
            
            // Continuer l'initialisation du jeu
            initializeGame();
        })
        .catch(error => {
            console.error('Erreur lors de la vérification des mots disponibles:', error);
        });
    }
    
    // Fonction pour initialiser le jeu après avoir vérifié les mots disponibles
    function initializeGame() {
        // Réinitialiser les variables
        score = 0;
        timer = 300;
        questionsAnswered = 0;
        correctAnswers = 0;
        streak = 0;
        bestStreak = 0;
        gameActive = true;
        previousWordId = null;
        timePerQuestion = [];
        
        // Mettre à jour l'affichage
        scoreDisplay.textContent = score;
        questionCountDisplay.textContent = `0/${totalQuestions}`;
        timerDisplay.textContent = timer;
        
        console.log('Starting game, loading first phrase');
        
        // Charger la première phrase
        loadNewPhrase();
        
        // Démarrer le timer
        timerInterval = setInterval(updateTimer, 1000);
        
        // Afficher l'écran de jeu actif
        preGameScreen.classList.remove('active');
        activeGameScreen.classList.add('active');
        postGameScreen.classList.remove('active');
        
        // Focus sur l'input
        wordInput.focus();
    }
    
    // Fonction pour charger une nouvelle phrase
    function loadNewPhrase() {
        // Guard to prevent multiple simultaneous calls
        if (isLoadingPhrase) {
            console.log('Already loading a phrase, ignoring duplicate call');
            return;
        }
        
        isLoadingPhrase = true;
        console.log('loadNewPhrase - starting request');
        
        // Réinitialiser l'état de la question
        wordInput.value = '';
        wordInput.classList.remove('correct', 'incorrect');
        wordInput.removeAttribute('disabled');
        submitBtn.disabled = false;
        feedbackMessage.textContent = '';
        feedbackMessage.className = 'feedback-message';
        nextPhraseBtn.disabled = true;
        wordMeaning.textContent = '';
        hintText.textContent = '';
        attempts = 0;
        
        // Enregistrer le temps de début pour calculer le temps par question
        startQuestionTime = Date.now();
        
        // Charger une nouvelle phrase du serveur
        fetch(`/games/phraseCompletion/phrase?previousWordId=${previousWordId || ''}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error(data.error);
                isLoadingPhrase = false;
                return;
            }
            
            // Stocker les données de la phrase courante
            currentPhrase = data;
            previousWordId = data.word_id;
            correctWord = data.word;
            
            // Formater la phrase avec un espace pour saisir le mot
            const formattedPhrase = data.phrase;
            phraseDisplay.innerHTML = formattedPhrase;
            
            // Focus sur l'input
            wordInput.focus();
            isLoadingPhrase = false;
        })
        .catch(error => {
            console.error('Erreur lors du chargement de la phrase:', error);
            isLoadingPhrase = false;
        });
    }
    
    // Fonction pour vérifier la réponse
    function checkAnswer() {
        console.log('checkAnswer');
        if (!gameActive || !currentPhrase) return;
        
        const userInput = wordInput.value.trim();
        
        attempts++;
        
        // Si l'utilisateur a soumis une réponse vide, ne rien faire
        if (userInput === '') {
            feedbackMessage.textContent = 'Veuillez saisir un mot';
            feedbackMessage.className = 'feedback-message';
            return;
        }
        
        // Calculer le temps pris pour répondre à cette question
        const questionTime = (Date.now() - startQuestionTime) / 1000; // en secondes
        timePerQuestion.push(questionTime);
        
        // Mettre à jour le compteur de questions
        questionsAnswered++;
        questionCountDisplay.textContent = `${questionsAnswered}/${totalQuestions}`;
        
        // Désactiver l'input et le bouton de validation
        wordInput.disabled = true;
        submitBtn.disabled = true;
        
        // Afficher la signification du mot
        if (currentPhrase && currentPhrase.meaning) {
            wordMeaning.textContent = `Signification: ${currentPhrase.meaning}`;
        }
        
        fetch(`/games/phraseCompletion/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userInput, correctWord })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error(data.error);
                return;
            }
        
            const isCorrect = data.correct;
        
            if (isCorrect) {
                // Réponse correcte
                correctAnswers++;
                streak++;
                bestStreak = Math.max(bestStreak, streak);
            
                // Calcul du score
                const basePoints = 10;
                
                // Bonus pour la rapidité (max 5 points bonus)
                const timeBonus = Math.max(0, Math.min(5, Math.round(10 - questionTime)));
                
                // Bonus pour la série
                const streakBonus = Math.floor(streak / 3) * 5; // 5 points tous les 3 mots consécutifs
                
                // Malus pour tentatives multiples
                const attemptsPenalty = Math.max(0, attempts - 1) * 2;
                
                const totalPoints = basePoints + timeBonus + streakBonus - attemptsPenalty;
                score += totalPoints;
                
                // Mettre à jour l'affichage
                scoreDisplay.textContent = score;
                
                // Feedback
                feedbackMessage.textContent = `Correct ! +${totalPoints} points`;
                feedbackMessage.className = 'feedback-message correct';
                wordInput.classList.remove('incorrect', 'correct');
                wordInput.classList.add('correct');
                
                // Remplacer le blanc par le mot correct en vert
                phraseDisplay.innerHTML = currentPhrase.phrase.replace('_____', `<span class="blank correct">${correctWord}</span>`);
            } else {
            // Réponse incorrecte
                streak = 0;
                
                // Feedback
                feedbackMessage.textContent = `Incorrect. La bonne réponse était "${correctWord}"`;
                feedbackMessage.className = 'feedback-message incorrect';
                wordInput.classList.remove('incorrect', 'correct');
                wordInput.classList.add('incorrect');
                
                // Remplacer le blanc par le mot correct en rouge
                phraseDisplay.innerHTML = currentPhrase.phrase.replace('_____', `<span class="blank incorrect">${correctWord}</span>`);
            }
        
        // Activer le bouton Suivant
            nextPhraseBtn.disabled = false;
            
            // Si c'est la dernière question, changer le texte du bouton
            if (questionsAnswered >= totalQuestions) {
                nextPhraseBtn.textContent = 'Voir les résultats';
            }
        })
        .catch(error => {
            console.error('Erreur lors de la vérification de la réponse:', error);
        });
    }
    
    // Fonction pour passer à la phrase suivante
    function goToNextPhrase() {
        console.log('Going to next phrase');
        
        // Si c'est la dernière question, terminer le jeu
        if (questionsAnswered >= totalQuestions) {
            endGame();
            return;
        }
        
        // Sinon, charger une nouvelle phrase
        loadNewPhrase();
    }
    
    // Fonction pour mettre à jour le timer
    function updateTimer() {
        timer--;
        timerDisplay.textContent = timer;
        
        if (timer <= 20) {
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
        
        // Calculer les statistiques
        const accuracy = questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0;
        
        // Calculer le temps moyen par question
        const avgTime = timePerQuestion.length > 0 
            ? Math.round(timePerQuestion.reduce((a, b) => a + b, 0) / timePerQuestion.length * 10) / 10
            : 0;
        
        // Mettre à jour l'écran de fin de jeu
        finalScoreDisplay.textContent = score;
        correctAnswersDisplay.textContent = `${correctAnswers}/${questionsAnswered}`;
        accuracyDisplay.textContent = `${accuracy}%`;
        bestStreakDisplay.textContent = bestStreak;
        avgTimeDisplay.textContent = `${avgTime}s`;
        
        // Check if game was completed successfully
        const minAccuracy = 70; // 70% accuracy
        const minQuestionsAnswered = Math.ceil(totalQuestions * 0.8); // 80% completion
        const isSuccessful = accuracy >= minAccuracy && questionsAnswered >= minQuestionsAnswered;
        
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
        fetch('/games/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                game_type: 'phrase_completion',
                score: score,
                details: {
                    questions_answered: questionsAnswered,
                    correct_answers: correctAnswers,
                    accuracy: questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0,
                    best_streak: bestStreak,
                    avg_time: timePerQuestion.length > 0 
                        ? Math.round(timePerQuestion.reduce((a, b) => a + b, 0) / timePerQuestion.length * 10) / 10
                        : 0
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
                game_type: 'phrase_completion',
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
    
    if (submitBtn) {
        submitBtn.addEventListener('click', checkAnswer);
    }
    
    if (wordInput) {
        wordInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                checkAnswer();
            }
        });
    }
    
    if (nextPhraseBtn) {
        nextPhraseBtn.addEventListener('click', goToNextPhrase);
    }
    
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', startGame);
    }
});