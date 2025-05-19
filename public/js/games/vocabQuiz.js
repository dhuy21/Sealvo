document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si nous sommes sur la page du jeu VocabQuiz
    // On vérifie un élément unique qui n'existe que sur cette page
    if (!document.getElementById('quiz-word')) {
        // Nous ne sommes pas sur la page VocabQuiz, ne pas exécuter le script
        return;
    }
    
    // Variables du jeu
    let currentQuestion = null;
    let currentQuestionIndex = 0;
    let score = 0;
    let correctAnswers = 0;
    let totalQuestions = 10;
    let gameActive = false;
    let optionsCount = 6; // Par défaut
    let currentSelectedOption = null;
    let availableWords = 0;
    const maxQuestions = 30;
    // Éléments DOM
    const startGameBtn = document.getElementById('start-game');
    const nextQuestionBtn = document.getElementById('next-question');
    const playAgainBtn = document.getElementById('play-again');
    const quizWordDisplay = document.getElementById('quiz-word');
    const optionsContainer = document.getElementById('options-container');
    const resultMessage = document.getElementById('result-message');
    const currentScoreDisplay = document.getElementById('current-score');
    const progressDisplay = document.getElementById('progress');
    const finalScoreDisplay = document.getElementById('final-score');
    const correctAnswersDisplay = document.getElementById('correct-answers');
    const accuracyDisplay = document.getElementById('accuracy');
    const highScoreMessage = document.getElementById('high-score-message');
    
    // Écrans de jeu
    const preGameScreen = document.querySelector('.pre-game-screen');
    const activeGameScreen = document.querySelector('.active-game-screen');
    const postGameScreen = document.querySelector('.post-game-screen');
    
    // Fonction pour démarrer le jeu
    function startGame() {
        // Vérifier le nombre de mots disponibles
        fetch('/games/vocabQuiz/available-words', {
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
            totalQuestions = Math.min(availableWords, maxQuestions);
            totalQuestions += parseInt(0.5*availableWords);
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
        correctAnswers = 0;
        currentQuestionIndex = 0;
        gameActive = true;
        
        // Mettre à jour l'affichage
        currentScoreDisplay.textContent = score;
        progressDisplay.textContent = `1/${totalQuestions}`;
        
        // Charger la première question
        loadNextQuestion();
        
        // Afficher l'écran de jeu actif
        preGameScreen.classList.remove('active');
        activeGameScreen.classList.add('active');
        postGameScreen.classList.remove('active');
    }
    
    // Fonction pour charger la prochaine question
    function loadNextQuestion() {
        // Réinitialiser l'état des boutons
        nextQuestionBtn.disabled = true;
        resultMessage.textContent = '';
        resultMessage.className = 'result-message';
        
        // Appel à l'API pour obtenir une question
        fetch(`/games/vocabQuiz/question`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error(data.error);
                resultMessage.textContent = data.error;
                resultMessage.className = 'result-message incorrect';
                return;
            }
            
            currentQuestion = data.question;
            
            // Mettre à jour l'affichage de la question
            quizWordDisplay.textContent = data.question.word;
            
            // Générer les options
            generateOptions(data.question.options, data.question.correctIndex);
            
            // Mettre à jour la progression
            currentQuestionIndex++;
            progressDisplay.textContent = `${currentQuestionIndex}/${totalQuestions}`;
        })
        .catch(error => {
            console.error('Erreur lors du chargement de la question:', error);
            resultMessage.textContent = 'Erreur lors du chargement de la question. Veuillez réessayer.';
            resultMessage.className = 'result-message incorrect';
        });
    }
    
    // Fonction pour générer les options
    function generateOptions(options, correctIndex) {
        optionsContainer.innerHTML = '';
        
        options.forEach((option, index) => {
            const optionBtn = document.createElement('button');
            optionBtn.className = 'option-btn';
            optionBtn.textContent = option;
            optionBtn.dataset.index = index;
            
            optionBtn.addEventListener('click', function() {
                if (nextQuestionBtn.disabled) {
                    // Désélectionner toute option précédemment sélectionnée
                    document.querySelectorAll('.option-btn').forEach(btn => {
                        btn.classList.remove('selected');
                    });
                    
                    // Sélectionner cette option
                    this.classList.add('selected');
                    currentSelectedOption = index;
                    
                    // Vérifier la réponse
                    checkAnswer(index, correctIndex);
                }
            });
            
            optionsContainer.appendChild(optionBtn);
        });
    }
    
    // Fonction pour vérifier la réponse
    function checkAnswer(selectedIndex, correctIndex) {
        const options = document.querySelectorAll('.option-btn');
        
        // Marquer la bonne réponse
        options[correctIndex].classList.add('correct');
        
        if (selectedIndex === correctIndex) {
            // Réponse correcte
            score += 10;
            correctAnswers++;
            resultMessage.textContent = 'Correct !';
            resultMessage.className = 'result-message correct';
        } else {
            // Réponse incorrecte
            options[selectedIndex].classList.add('incorrect');
            score = Math.max(0, score - 5); // Éviter un score négatif
            resultMessage.textContent = 'Incorrect !';
            resultMessage.className = 'result-message incorrect';
        }
        
        // Mettre à jour le score
        currentScoreDisplay.textContent = score;
        
        // Activer le bouton suivant
        nextQuestionBtn.disabled = false;
        
        // Si c'est la dernière question, changer le texte du bouton
        if (currentQuestionIndex === totalQuestions) {
            nextQuestionBtn.textContent = 'Voir les résultats';
        }
    }
    
    // Fonction pour passer à la question suivante
    function goToNextQuestion() {
        if (currentQuestionIndex < totalQuestions) {
            loadNextQuestion();
        } else {
            endGame();
        }
    }
    
    // Fonction pour terminer le jeu
    function endGame() {
        gameActive = false;
        
        // Mettre à jour l'écran de fin de jeu
        finalScoreDisplay.textContent = score;
        correctAnswersDisplay.textContent = correctAnswers;
        
        const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
        accuracyDisplay.textContent = `${accuracy}%`;
        
        // Check if game was completed successfully
        const minCorrectAnswers = Math.ceil(totalQuestions * 0.7); // 70% correct answers
        const isSuccessful = correctAnswers >= minCorrectAnswers;
        
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
        // Simuler l'enregistrement du score
        // Dans une vraie implémentation, vous feriez un appel fetch à votre API
        fetch('/games/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                game_type: 'vocab_quiz',
                score: score,
                details: {
                    correct_answers: correctAnswers,
                    total_questions: totalQuestions,
                    accuracy: Math.round((correctAnswers / totalQuestions) * 100)
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
                game_type: 'vocab_quiz',
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
    
    if (nextQuestionBtn) {
        nextQuestionBtn.addEventListener('click', goToNextQuestion);
    }
    
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', startGame);
    }
});