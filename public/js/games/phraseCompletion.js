document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si nous sommes sur la page du jeu Phrase Completion
    if (!document.getElementById('phrase-display')) {
        // Nous ne sommes pas sur la page Phrase Completion, ne pas exécuter le script
        return;
    }
    
    console.log('PhraseCompletion script initialized');
    
    // Initialize literary background effects
    initializeStarryEffects();
    
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
    
    
    // Fonction pour initialiser les effets étoilés
    function initializeStarryEffects() {
        createStarryFocusRings();
        createFloatingCelestialElements();
        startStarryBackgroundAnimation();
    }
    
    // Fonction pour créer les anneaux de focus étoilés
    function createStarryFocusRings() {
        for (let i = 0; i < 4; i++) {
            const ring = document.createElement('div');
            ring.className = 'starry-focus-ring';
            ring.style.animationDelay = `${i * 1.5}s`;
            document.querySelector('.game-container').appendChild(ring);
        }
    }
    
    // Fonction pour créer des éléments flottants célestes
    function createFloatingCelestialElements() {
        for (let i = 0; i < 10; i++) {
            const element = document.createElement('div');
            element.className = 'floating-celestial-element';
            element.style.left = Math.random() * 100 + '%';
            element.style.top = Math.random() * 100 + '%';
            element.style.animationDelay = Math.random() * 8 + 's';
            element.style.animationDuration = (6 + Math.random() * 4) + 's';
            
            // Symboles célestes et d'étoiles
            const symbols = ['⭐'];
            element.textContent = symbols[i % symbols.length];
            
            document.querySelector('.game-container').appendChild(element);
        }
    }
    
    // Fonction pour démarrer l'animation de fond étoilé
    function startStarryBackgroundAnimation() {
        const container = document.querySelector('.game-container');
        container.classList.add('enhanced-starry-mode');
        
        // Démarrer les étoiles qui tombent aléatoirement
        startRandomFallingStars();
    }
    
    // Fonction pour créer des étoiles qui tombent aléatoirement
    function startRandomFallingStars() {
        // Créer plusieurs étoiles à la fois
        function createMultipleStars() {
            // Créer 3-6 étoiles en même temps
            const numberOfStars = 3 + Math.floor(Math.random() * 4);
            
            for (let i = 0; i < numberOfStars; i++) {
                // Délai légèrement différent pour chaque étoile (0-500ms)
                setTimeout(() => {
                    createRandomStar();
                }, Math.random() * 500);
            }
        }
        
        function createRandomStar() {
            const star = document.createElement('div');
            star.className = 'random-falling-star';
            
            // Utiliser seulement le symbole ⭐
            star.textContent = '⭐';
            
            // Position horizontale aléatoire
            const leftPosition = Math.random() * 100;
            star.style.left = leftPosition + '%';
            star.style.top = '-50px';
            
            // Couleurs aléatoires
            const colors = [
                'rgba(255, 255, 255, 0.9)',
                'rgba(147, 197, 253, 0.8)',
                'rgba(196, 181, 253, 0.7)',
                'rgba(251, 191, 36, 0.8)',
                'rgba(34, 197, 94, 0.7)'
            ];
            star.style.color = colors[Math.floor(Math.random() * colors.length)];
            
            // Taille aléatoire
            const size = 0.8 + Math.random() * 0.8; // 0.8 à 1.6
            star.style.fontSize = size + 'rem';
            
            document.body.appendChild(star);
            
            // Animation de chute libre avec physique
            const duration = 3000 + Math.random() * 4000; // 3-7 secondes
            const horizontalDrift = (Math.random() - 0.5) * 200; // -100px à +100px
            const rotation = Math.random() * 720; // 0 à 720 degrés
            
            const animation = star.animate([
                {
                    transform: 'translateY(0) translateX(0) rotate(0deg) scale(0.5)',
                    opacity: 0
                },
                {
                    transform: 'translateY(50px) translateX(0) rotate(' + (rotation * 0.1) + 'deg) scale(1)',
                    opacity: 1,
                    offset: 0.1
                },
                {
                    transform: 'translateY(' + (window.innerHeight + 100) + 'px) translateX(' + horizontalDrift + 'px) rotate(' + rotation + 'deg) scale(0.3)',
                    opacity: 0
                }
            ], {
                duration: duration,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
            
            animation.onfinish = () => {
                star.remove();
            };
        }
        
        // Créer le premier groupe d'étoiles immédiatement
        createMultipleStars();
        
        // Puis créer des groupes d'étoiles à intervalles plus courts
        function scheduleNextStarGroup() {
            const delay = 400 + Math.random() * 800; // 0.4 à 1.2 secondes
            setTimeout(() => {
                createMultipleStars();
                scheduleNextStarGroup(); // Programmer le prochain groupe
            }, delay);
        }
        
        scheduleNextStarGroup();
    }
    
    // Fonction pour créer un effet de machine à écrire
    function createTypewriterEffect(element, text, speed = 50) {
        element.textContent = '';
        let i = 0;
        
        const typeInterval = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(typeInterval);
            }
        }, speed);
    }
    
    // Fonction pour créer des particules d'étoiles
    function createStarParticles(isCorrect = true) {
        const colors = isCorrect ? 
            ['#93c5fd', '#c4b5fd', '#fbbf24', '#34d399'] : 
            ['#ef4444', '#f59e0b', '#8b5cf6', '#6366f1'];
        
        const symbols = isCorrect ? ['⭐', '✨', '🌟', '💫'] : ['💥', '☄️', '🌠', '⚡'];
        
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'star-particle';
            particle.style.position = 'fixed';
            particle.style.fontSize = '1.8rem';
            particle.style.color = colors[Math.floor(Math.random() * colors.length)];
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '1000';
            particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            
            // Position autour du centre
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            particle.style.left = (centerX + (Math.random() - 0.5) * 300) + 'px';
            particle.style.top = (centerY + (Math.random() - 0.5) * 300) + 'px';
            
            document.body.appendChild(particle);
            
            // Animation de la particule avec effet d'étoile filante
            const animation = particle.animate([
                { 
                    transform: 'scale(0) rotate(0deg)', 
                    opacity: 1,
                    filter: 'brightness(1)'
                },
                { 
                    transform: 'scale(1.5) rotate(180deg)', 
                    opacity: 0.9,
                    filter: 'brightness(1.5)',
                    offset: 0.3
                },
                { 
                    transform: `scale(0.5) rotate(360deg) translate(${(Math.random() - 0.5) * 400}px, ${(Math.random() - 0.5) * 400}px)`, 
                    opacity: 0,
                    filter: 'brightness(0.5)'
                }
            ], {
                duration: 3000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
            
            animation.onfinish = () => {
                particle.remove();
            };
        }
    }
    
    // Fonction pour créer un effet de constellation qui se forme
    function createConstellationEffect(isCorrect = true) {
        const constellation = document.createElement('div');
        constellation.className = isCorrect ? 'constellation-success' : 'constellation-error';
        constellation.style.position = 'fixed';
        constellation.style.top = '50%';
        constellation.style.left = '50%';
        constellation.style.width = '0';
        constellation.style.height = '0';
        constellation.style.borderRadius = '50%';
        constellation.style.background = isCorrect ? 
            'radial-gradient(circle, rgba(147, 197, 253, 0.3) 0%, rgba(196, 181, 253, 0.2) 50%, transparent 70%)' : 
            'radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, rgba(245, 158, 11, 0.2) 50%, transparent 70%)';
        constellation.style.transform = 'translate(-50%, -50%)';
        constellation.style.pointerEvents = 'none';
        constellation.style.zIndex = '999';
        constellation.style.boxShadow = isCorrect ?
            '0 0 50px rgba(147, 197, 253, 0.4)' :
            '0 0 50px rgba(239, 68, 68, 0.4)';
        
        document.body.appendChild(constellation);
        
        const animation = constellation.animate([
            { 
                width: '0px', 
                height: '0px', 
                opacity: 1,
                boxShadow: isCorrect ? '0 0 0px rgba(147, 197, 253, 0)' : '0 0 0px rgba(239, 68, 68, 0)'
            },
            { 
                width: '600px', 
                height: '600px', 
                opacity: 0.7,
                boxShadow: isCorrect ? '0 0 100px rgba(147, 197, 253, 0.6)' : '0 0 100px rgba(239, 68, 68, 0.6)',
                offset: 0.6
            },
            { 
                width: '800px', 
                height: '800px', 
                opacity: 0,
                boxShadow: isCorrect ? '0 0 150px rgba(147, 197, 253, 0)' : '0 0 150px rgba(239, 68, 68, 0)'
            }
        ], {
            duration: 2000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });
        
        animation.onfinish = () => {
            constellation.remove();
        };
    }
    
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
            
            // Effet de machine à écrire pour la phrase
            phraseDisplay.innerHTML = '';
            createTypewriterEffect(phraseDisplay, formattedPhrase, 30);
            
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
                
                // Effets littéraires pour réponse correcte
                createStarParticles(true);
                createConstellationEffect(true);
                
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
                
                // Effets littéraires pour réponse incorrecte
                createStarParticles(false);
                createConstellationEffect(false);
                
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