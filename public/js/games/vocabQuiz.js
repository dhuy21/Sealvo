document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si nous sommes sur la page du jeu VocabQuiz
    // On vérifie un élément unique qui n'existe que sur cette page
    if (!document.getElementById('quiz-word')) {
        // Nous ne sommes pas sur la page VocabQuiz, ne pas exécuter le script
        return;
    }
    
    // Variables du jeu
    let currentQuestion = null;
    let questionWords = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let correctAnswers = 0;
    let totalQuestions = 10;
    let gameActive = false;
    let currentTime = 0;
    let startTime;
    let timerInterval;
    let optionsCount = 6; // Par défaut
    let availableWords = 0;
    const maxQuestions = 300;
    
    // Animation variables
    let audioContext = null;
    let animationParticles = [];
    
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
    const trackLevelMessage = document.getElementById('track-level-message');
    const accuracyDisplay = document.getElementById('accuracy');
    const packageId = document.getElementById('package-id').getAttribute('data-package');
    const loader = document.getElementById('loader');
    
    // Écrans de jeu
    const preGameScreen = document.querySelector('.pre-game-screen');
    const activeGameScreen = document.querySelector('.active-game-screen');
    const postGameScreen = document.querySelector('.post-game-screen');

    // Initialize modern lovely quiz effects
    initializeQuizEffects();
    
    // Fonction pour initialiser les effets modernes et adorables du quiz
    function initializeQuizEffects() {
        createLovelyFloatingElements();
        initializeAudio();
        startModernBackgroundAnimation();
    }
    

    
    // Fonction pour créer des éléments flottants adorables
    function createLovelyFloatingElements() {
        for (let i = 0; i < 6; i++) {
            const element = document.createElement('div');
            element.className = 'floating-quiz-element';
            element.style.left = Math.random() * 100 + '%';
            element.style.top = Math.random() * 100 + '%';
            element.style.animationDelay = Math.random() * 5 + 's';
            element.style.animationDuration = (8 + Math.random() * 4) + 's';
            
            // Symboles de nuages et du ciel
            const symbols = ['☁️', '🌤️', '⛅', '🌥️', '🌦️', '🌈'];
            element.textContent = symbols[i % symbols.length];
            
            document.querySelector('.game-container').appendChild(element);
        }
    }
    
    // Fonction pour démarrer l'animation de fond moderne
    function startModernBackgroundAnimation() {
        const container = document.querySelector('.game-container');
        container.classList.add('enhanced-quiz-mode');
    }
    
    // Fonction pour initialiser le contexte audio
    function initializeAudio() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }
    
    // Fonction pour jouer un son de succès doux et moderne
    function playSuccessSound() {
        if (!audioContext) return;
        
        // Son de succès harmonieux
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator1.frequency.setValueAtTime(523, audioContext.currentTime); // C5
        oscillator1.frequency.setValueAtTime(659, audioContext.currentTime + 0.15); // E5
        oscillator1.frequency.setValueAtTime(784, audioContext.currentTime + 0.3); // G5
        
        oscillator2.frequency.setValueAtTime(262, audioContext.currentTime); // C4
        oscillator2.frequency.setValueAtTime(330, audioContext.currentTime + 0.15); // E4
        
        gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator1.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.5);
        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.5);
    }
    
    // Fonction pour jouer un son d'erreur doux
    function playErrorSound() {
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(280, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(160, audioContext.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }
    
    // Fonction pour créer des particules adorables
    function createLovelyParticles(isCorrect = true) {
        const colors = isCorrect ? 
            ['#ffb6c1', '#ffc0cb', '#dda0dd', '#98fb98'] : 
            ['#ffa07a', '#f0a0a0', '#ffb6c1', '#dda0dd'];
        
        const symbols = isCorrect ? ['✨', '💫', '🌟', '💖'] : ['💭', '🌸', '🦋', '💝'];
        
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'lovely-particle';
            particle.style.position = 'fixed';
            particle.style.fontSize = '1.2rem';
            particle.style.color = colors[Math.floor(Math.random() * colors.length)];
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '1000';
            particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            
            // Position douce autour du centre
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            particle.style.left = (centerX + (Math.random() - 0.5) * 150) + 'px';
            particle.style.top = (centerY + (Math.random() - 0.5) * 150) + 'px';
            
            document.body.appendChild(particle);
            
            // Animation douce de la particule
            const animation = particle.animate([
                { 
                    transform: 'scale(0) rotate(0deg)', 
                    opacity: 1 
                },
                { 
                    transform: 'scale(1.2) rotate(180deg)', 
                    opacity: 0.9,
                    offset: 0.4
                },
                { 
                    transform: `scale(0) rotate(360deg) translate(${(Math.random() - 0.5) * 200}px, ${(Math.random() - 0.5) * 200}px)`, 
                    opacity: 0 
                }
            ], {
                duration: 2000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
            
            animation.onfinish = () => {
                particle.remove();
            };
        }
    }
    
    // Fonction pour ajouter l'animation de nouvelle question moderne
    function addNewQuestionAnimation() {
        const quizWordContainer = document.querySelector('.quiz-word-container');
        quizWordContainer.classList.add('new-question');
        
        // Ajouter un effet de morphing doux au conteneur
        activeGameScreen.classList.add('question-loading');
        
        setTimeout(() => {
            quizWordContainer.classList.remove('new-question');
            activeGameScreen.classList.remove('question-loading');
        }, 1800);
    }
    
    // Fonction pour créer un effet de vague douce
    function createGentleWaveEffect(isCorrect = true) {
        const wave = document.createElement('div');
        wave.className = isCorrect ? 'lovely-success-wave' : 'lovely-error-wave';
        wave.style.position = 'fixed';
        wave.style.top = '50%';
        wave.style.left = '50%';
        wave.style.width = '0';
        wave.style.height = '0';
        wave.style.borderRadius = '50%';
        wave.style.background = isCorrect ? 
            'radial-gradient(circle, rgba(255, 182, 193, 0.3) 0%, transparent 70%)' : 
            'radial-gradient(circle, rgba(255, 160, 122, 0.3) 0%, transparent 70%)';
        wave.style.transform = 'translate(-50%, -50%)';
        wave.style.pointerEvents = 'none';
        wave.style.zIndex = '999';
        
        document.body.appendChild(wave);
        
        const animation = wave.animate([
            { 
                width: '0px', 
                height: '0px', 
                opacity: 1 
            },
            { 
                width: '400px', 
                height: '400px', 
                opacity: 0 
            }
        ], {
            duration: 1200,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });
        
        animation.onfinish = () => {
            wave.remove();
        };
    }
    
    // Fonction pour arrêter les effets
    function stopEffects() {
        activeGameScreen.classList.remove('quiz-active');
        document.querySelector('.game-container').classList.remove('enhanced-quiz-mode');
        
        // Nettoyer les particules
        animationParticles.forEach(particle => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        });
        animationParticles = [];
    }
    
    // Fonction pour démarrer le jeu
    function startGame() {
        // Vérifier le nombre de mots disponibles
        fetch(`/games/vocabQuiz/available-words?package=${packageId}`, {
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
        currentTime = 0;
        startTime = null;
        timerInterval = null;
        // Show loader immediately when starting game
        quizWordDisplay.textContent = '';
        loader.removeAttribute('style');
        optionsContainer.innerHTML = '';
        resultMessage.textContent = '';
        nextQuestionBtn.disabled = true;
        
        // Start modern lovely quiz effects
        activeGameScreen.classList.add('quiz-active');
        document.querySelector('.game-container').classList.add('enhanced-quiz-mode');
        
        // Mettre à jour l'affichage
        currentScoreDisplay.textContent = score;
        progressDisplay.textContent = `1/${totalQuestions}`;
        
        // Charger la première question with shorter delay
        setTimeout(loadQuestions, 3000);
        
        // Afficher l'écran de jeu actif
        preGameScreen.classList.remove('active');
        activeGameScreen.classList.add('active');
        postGameScreen.classList.remove('active');
    }

    // Fonction pour charger la prochaine question
    function loadQuestions() {
        // Add modern lovely new question animation
        addNewQuestionAnimation();
        
        // Réinitialiser l'état des boutons
        nextQuestionBtn.disabled = true;
        resultMessage.textContent = '';
        resultMessage.className = 'result-message';
        
        // Appel à l'API pour obtenir des questions
        fetch(`/games/vocabQuiz/questions?package=${packageId}`, {
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
            
            for (let i=0; i < totalQuestions; i++) {
                
                questionWords[i] = data.questionWords[i % data.questionWords.length];

            }


            currentQuestion = questionWords[currentQuestionIndex];
            
            // Hide loader and show question with animation
            quizWordDisplay.textContent = currentQuestion.word;
            loader.setAttribute('style', 'display: none;');
            quizWordDisplay.classList.add('revealing');
            setTimeout(() => {
                quizWordDisplay.classList.remove('revealing');
            }, 1200);
            
            
            
            // Générer les options
            generateOptions(currentQuestion.options, currentQuestion.correctIndex);

            // Démarrer le timer
            startTime = Date.now();
            timerInterval = setInterval(updateTimer, 1000);

            // Mettre à jour la progression avec animation plus visible
            currentQuestionIndex++;
            progressDisplay.textContent = `${currentQuestionIndex}/${totalQuestions}`;
            progressDisplay.classList.add('updating');
            setTimeout(() => {
                progressDisplay.classList.remove('updating');
            }, 800);
        })
        .catch(error => {
            console.error('Erreur lors du chargement de la question:', error);
            resultMessage.textContent = 'Erreur lors du chargement de la question. Veuillez réessayer.';
            resultMessage.className = 'result-message incorrect';
            // Hide loader on error too
            loader.setAttribute('style', 'display: none;');
        });
    }

    // Fonction pour mettre à jour le timer
    function updateTimer() {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        currentTime = elapsed;   
    }
    
    // Fonction pour générer les options
    function generateOptions(options, correctIndex) {
        optionsContainer.innerHTML = '';
        let currentSelectedOptions = [];
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
                    currentSelectedOptions.push(index);
                    
                    // Vérifier la réponse
                    if (currentSelectedOptions.length === correctIndex.length) {
                        checkAnswer(currentSelectedOptions, correctIndex);
                    }
                }
            });
            
            optionsContainer.appendChild(optionBtn);
        });
    }


    
    // Fonction pour vérifier la réponse (ou les réponses)
    function checkAnswer(selectedIndexes, correctIndexes) {
        const options = document.querySelectorAll('.option-btn');
        
        // Vérifier si les réponses sont correctes
        if (selectedIndexes.every(index => correctIndexes.includes(index))) {

            // Réponse correcte
            score += 10*selectedIndexes.length;
            correctAnswers++;
            
            // Play modern lovely success sound
            playSuccessSound();
            
            // Create lovely particles
            createLovelyParticles(true);
            
            // Create gentle wave effect
            createGentleWaveEffect(true);
            
            // Animate score increase with more visibility
            currentScoreDisplay.classList.add('score-increase');
            setTimeout(() => {
                currentScoreDisplay.classList.remove('score-increase');
            }, 1000);
            
            resultMessage.textContent = 'Excellent ! 🎉';
            resultMessage.className = 'result-message correct';
        } else {
            // Réponses incorrectes
            for (let i = 0; i < selectedIndexes.length; i++) {
                options[selectedIndexes[i]].classList.add('incorrect');
            }
            score = Math.max(0, score - 5*selectedIndexes.length); // Éviter un score négatif
            
            // Play modern lovely error sound
            playErrorSound();
            
            // Create error particles
            createLovelyParticles(false);
            
            // Create error wave effect
            createGentleWaveEffect(false);
            
            resultMessage.textContent = 'Pas tout à fait... 💭';
            resultMessage.className = 'result-message incorrect';
        }
        
        
        // Marquer les bonnes réponses
        for (let i = 0; i < correctIndexes.length; i++) {
            options[correctIndexes[i]].classList.remove('incorrect');
            options[correctIndexes[i]].classList.add('correct');
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
            // Add modern lovely new question animation
            addNewQuestionAnimation();
            
            // Réinitialiser l'état des boutons
            nextQuestionBtn.disabled = true;
            resultMessage.textContent = '';
            resultMessage.className = 'result-message';

            currentQuestion = questionWords[currentQuestionIndex];
            
            
            // Mettre à jour l'affichage de la question avec animation plus visible
            quizWordDisplay.textContent = currentQuestion.word;
            quizWordDisplay.classList.add('revealing');
            setTimeout(() => {
                quizWordDisplay.classList.remove('revealing');
            }, 1200);
            
            // Générer les options
            generateOptions(currentQuestion.options, currentQuestion.correctIndex);
            
            // Mettre à jour la progression avec animation plus visible
            currentQuestionIndex++;
            progressDisplay.textContent = `${currentQuestionIndex}/${totalQuestions}`;
            progressDisplay.classList.add('updating');
            setTimeout(() => {
                progressDisplay.classList.remove('updating');
            }, 800);

        } else {
            endGame();
        }
    }


    
    // Fonction pour terminer le jeu
    function endGame() {
        gameActive = false;
        
        // Stop effects
        stopEffects();
        
        // Add modern lovely completion glow for good performance
        const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
        if (accuracy >= 70) {
            activeGameScreen.classList.add('quiz-completion-glow');
            
            // Create massive celebration
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    createLovelyParticles(true);
                }, i * 300);
            }
            
            setTimeout(() => {
                activeGameScreen.classList.remove('quiz-completion-glow');
            }, 3000);
        }
        
        // Mettre à jour l'écran de fin de jeu
        finalScoreDisplay.textContent = score;
        correctAnswersDisplay.textContent = correctAnswers;

        const minutes = Math.floor(currentTime / 60);
        const seconds = currentTime % 60;
        if (accuracyDisplay) accuracyDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Check if game was completed successfully
        const minCorrectAnswers = Math.ceil(totalQuestions * 0.7); // 70% correct answers
        const isSuccessful = correctAnswers >= minCorrectAnswers;
        
        // Track level progress
        trackLevelProgress(isSuccessful);
        
        // Enregistrer le score
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
        fetch(`/level-progress/track?package=${packageId}`, {
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