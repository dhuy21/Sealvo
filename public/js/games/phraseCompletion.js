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
    let correctWords = [];
    let phrases = [];
    let score = 0;
    let timer = 300;
    let gameActive = false;
    let timerInterval = null;
    let correctAnswers = 0;
    let streak = 0;
    let bestStreak = 0;
    let totalQuestions = 0; // Valeur par défaut qui sera mise à jour
    let availableWords = 0; // Nombre de mots disponibles pour ce niveau
    let currentQuestionIndex = 0;
    const maxQuestions = 100; // Maximum de questions

    
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
    const feedbackMessage = document.getElementById('feedback-message');
    const nextPhraseBtn = document.getElementById('next-phrase-btn');
    const scoreDisplay = document.getElementById('score');
    const questionCountDisplay = document.getElementById('question-count');
    const timerDisplay = document.getElementById('timer');
    const finalScoreDisplay = document.getElementById('final-score');
    const correctAnswersDisplay = document.getElementById('correct-answers');
    const bestStreakDisplay = document.getElementById('best-streak');
    const loader = document.getElementById('loader');
    const playAgainBtn = document.getElementById('play-again');
    const trackLevelMessage = document.getElementById('track-level-message');
    const package_id = document.getElementById('package-id').getAttribute('data-package');

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
        fetch(`/games/phraseCompletion/available-words?package=${package_id}`, {
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
            totalQuestions = Math.min(availableWords, maxQuestions) ; // Maximum 100 questions ou le nombre de mots disponibles
            totalQuestions += parseInt(0.5*availableWords);
            
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
        correctAnswers = 0;
        streak = 0;
        bestStreak = 0;
        gameActive = true;
        timePerQuestion = [];
        phraseDisplay.textContent = '';
        loader.removeAttribute('style');
        
        // Mettre à jour l'affichage
        scoreDisplay.textContent = score;
        questionCountDisplay.textContent = `${currentQuestionIndex}/${totalQuestions}`;
        timerDisplay.textContent = timer;
        
        console.log('Starting game, loading first phrase');
        
        // Charger la première phrase
        loadNewPhrase();
        
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
        attempts = 0;
        
        // Enregistrer le temps de début pour calculer le temps par question
        startQuestionTime = Date.now();
        
        // Charger une nouvelle phrase du serveur
        fetch(`/games/phraseCompletion/phrases?package=${package_id}`, {
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
            
            for (let i=0; i < totalQuestions; i++) {
                
                phrases[i] = data.phrases[i % data.phrases.length];

            }

            // Stocker les données de la phrase courante
            currentPhrase = phrases[currentQuestionIndex];
            correctWords = currentPhrase.correctWords;
            
            // Formater la phrase avec un espace pour saisir le mot
            const formattedPhrase = currentPhrase.phrase;
            
            // Effet de machine à écrire pour la phrase
            phraseDisplay.innerHTML = '';
            loader.setAttribute('style', 'display: none;');
            createTypewriterEffect(phraseDisplay, formattedPhrase, 30);

            // Démarrer le timer
            timerInterval = setInterval(updateTimer, 1000);
            
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
        
        const userInputs = wordInput.value.trim().split(';');
        const cleanedUserInputs = userInputs.map(input => input.trim());
        
        attempts++;
        
        // Si l'utilisateur a soumis une réponse vide, ne rien faire
        if (userInputs === '') {
            feedbackMessage.textContent = 'Veuillez saisir un mot';
            feedbackMessage.className = 'feedback-message';
            return;
        }
        
        // Calculer le temps pris pour répondre à cette question
        const questionTime = (Date.now() - startQuestionTime) / 1000; // en secondes
        timePerQuestion.push(questionTime);
        
        // Mettre à jour le compteur de questions
        currentQuestionIndex++;
        questionCountDisplay.textContent = `${currentQuestionIndex}/${totalQuestions}`;
        
        // Désactiver l'input et le bouton de validation
        wordInput.disabled = true;
        submitBtn.disabled = true;

        // Afficher la signification du mot
        if (currentPhrase && currentPhrase.meaningWord) {
            wordMeaning.textContent = `Signification: ${currentPhrase.meaningWord}`;
        }
        
        // Vérifier si la réponse est correcte
        const correctWordsLower = correctWords.map(word => word.toLowerCase());

        // vérifier si deux array sont identiques dans l'ordre
        const isCorrect = cleanedUserInputs.length === correctWordsLower.length && cleanedUserInputs.every((val, i) => val === correctWordsLower[i]);


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
                
                // Remplacer chaque blanc par chaque mot correct en vert
                // Replace all blanks with correct words
                let updatedPhrase = currentPhrase.phrase;
                for (let i = 0; i < correctWords.length; i++) {
                    updatedPhrase = updatedPhrase.replace('_____', `<span class="blank correct">${correctWords[i]}</span>`);
                }
                phraseDisplay.innerHTML = updatedPhrase;
               
        } else {
            // Réponse incorrecte
                streak = 0;
                
                // Effets littéraires pour réponse incorrecte
                createStarParticles(false);
                createConstellationEffect(false);
                
                // Feedback
                feedbackMessage.textContent = `Incorrect. La bonne réponse était "${correctWords.join(' ')}"`;
                feedbackMessage.className = 'feedback-message incorrect';
                wordInput.classList.remove('incorrect', 'correct');
                wordInput.classList.add('incorrect');
                
                //replace all blanks with correct words in red
                let updatedPhrase = currentPhrase.phrase;
                for (let i = 0; i < correctWords.length; i++) {
                    updatedPhrase = updatedPhrase.replace('_____', `<span class="blank incorrect">${correctWords[i]}</span>`);
                }
                phraseDisplay.innerHTML = updatedPhrase;
        }
        
        // Activer le bouton Suivant
        nextPhraseBtn.disabled = false;
            
        // Si c'est la dernière question, changer le texte du bouton
        if (currentQuestionIndex >= totalQuestions) {
            nextPhraseBtn.textContent = 'Voir les résultats';
        }
        
    }
    
    // Fonction pour passer à la phrase suivante
    function goToNextPhrase() {
        
        // Si c'est la dernière question, terminer le jeu
        if (currentQuestionIndex >= totalQuestions) {
            endGame();
            return;
        }
        
        // Sinon, charger une nouvelle phrase
        // Réinitialiser l'état de la question
        wordInput.value = '';
        wordInput.classList.remove('correct', 'incorrect');
        wordInput.removeAttribute('disabled');
        submitBtn.disabled = false;
        feedbackMessage.textContent = '';
        feedbackMessage.className = 'feedback-message';
        nextPhraseBtn.disabled = true;
        wordMeaning.textContent = '';
        attempts = 0;
        
        // Enregistrer le temps de début pour calculer le temps par question
        startQuestionTime = Date.now();
        // Stocker les données de la phrase courante
        currentPhrase = phrases[currentQuestionIndex];
        correctWords = currentPhrase.correctWords;
        
        // Formater la phrase avec un espace pour saisir le mot
        const formattedPhrase = currentPhrase.phrase;
        
        // Effet de machine à écrire pour la phrase
        phraseDisplay.innerHTML = '';
        createTypewriterEffect(phraseDisplay, formattedPhrase, 30);
        
        // Focus sur l'input
        wordInput.focus();
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
        const accuracy = currentQuestionIndex > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        
        // Calculer le temps moyen par question
        const avgTime = timePerQuestion.length > 0 
            ? Math.round(timePerQuestion.reduce((a, b) => a + b, 0) / timePerQuestion.length * 10) / 10
            : 0;
        
        // Mettre à jour l'écran de fin de jeu
        finalScoreDisplay.textContent = score;
        correctAnswersDisplay.textContent = `${correctAnswers}/${totalQuestions}`;
        bestStreakDisplay.textContent = bestStreak;

        
        // Check if game was completed successfully
        const minAccuracy = 80; // 80% accuracy
        console.log('Accuracy:', accuracy);
        const isSuccessful = accuracy >= minAccuracy ;
        
        // Track level progress
        trackLevelProgress(isSuccessful);
 
        // Save score
        saveScore(score);

        // Afficher le message de progression de niveau
        if (trackLevelMessage) {
            if (isSuccessful) {
                trackLevelMessage.textContent = 'Excellent travail ! Progressez les autres jeux de ce niveau 😍';
                trackLevelMessage.classList.add('level-completed');
            } else {
                trackLevelMessage.textContent = 'Bon courage ! Réessayer ce jeu pour améliorer vos compétences 🤧' ;
                trackLevelMessage.classList.remove('level-completed');
            }
        }
        
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
        const duration = 15* 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
          
            if (timeLeft <= 0) {
              return clearInterval(interval);
            }
          
            const particleCount = 50 * (timeLeft / duration);
          
            // since particles fall down, start a bit higher than random
            confetti(
              Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
              })
            );
            confetti(
              Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
              })
            );
          }, 250);
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
                    questions_answered: currentQuestionIndex,
                    correct_answers: correctAnswers,
                    accuracy: currentQuestionIndex > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
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
        fetch(`/level-progress/track?package=${package_id}`, {
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

    // Fonction de test pour forcer l'affichage de l'écran de fin (pour débogage)
    window.testEndGame = function() {
        console.log('Testing end game...');
        correctAnswers = totalQuestions;
        endGame();
    };
    
    // Ajouter un raccourci clavier pour tester (Ctrl+Shift+E)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'E') {
            console.log('Test end game triggered by keyboard shortcut');
            window.testEndGame();
        }
    });
});