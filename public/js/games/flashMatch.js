document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si nous sommes sur la page du jeu FlashMatch
    
    // Create animated bubbles for background 
    createAnimatedBubbles();
    
    
    // Variables du jeu
    let cards = [];
    let selectedCards = [];
    let matchedPairs = 0;
    let totalPairs = 15; // Par défaut (max 15)
    let moves = 0;
    let gameActive = false;
    let timerInterval = null;
    let startTime = null;
    let currentTime = 0;
    
    // Éléments DOM
    const startGameBtn = document.getElementById('start-game');
    const gameBoard = document.getElementById('game-board');
    const movesCount = document.getElementById('moves-count');
    const pairsCount = document.getElementById('pairs-count');
    const timerDisplay = document.getElementById('timer');
    const playAgainBtn = document.getElementById('play-again');
    const finalScore = document.getElementById('final-score');
    const finalTime = document.getElementById('final-time');
    const finalMoves = document.getElementById('final-moves');
    const trackLevelMessage = document.getElementById('track-level-message');
    const packageId = document.getElementById('package-id').getAttribute('data-package');
    const loader = document.getElementById('loader');
    const playAgainContainer = document.getElementById('play-again-container');
    
    // Écrans de jeu
    const preGameScreen = document.querySelector('.pre-game-screen');
    const activeGameScreen = document.querySelector('.active-game-screen');
    const postGameScreen = document.querySelector('.post-game-screen');
    ;
    
    // Function to create optimized animated bubbles
    function createAnimatedBubbles() {
        const gameContainer = document.querySelector('.game-container');
        if (!gameContainer) return;
        
        // Optimized bubble configurations - reduced count for better performance
        const bubbleConfigs = [
            // Large bubbles - reduced from 3 to 2
            { size: 'large', count: 2, colors: ['', 'blue'] },
            // Medium bubbles - reduced from 4 to 3
            { size: 'medium', count: 3, colors: ['', 'purple', 'pink'] },
            // Small bubbles - reduced from 5 to 4
            { size: 'small', count: 4, colors: ['', 'blue', 'purple', 'pink'] },
            // Tiny bubbles - reduced from 6 to 3
            { size: 'tiny', count: 3, colors: ['', 'pink', 'blue'] }
        ];
        
        // Create bubbles with optimized performance
        bubbleConfigs.forEach(config => {
            for (let i = 0; i < config.count; i++) {
                const bubble = document.createElement('div');
                bubble.className = `bubble ${config.size}`;
                
                // Add color class if specified
                if (config.colors[i]) {
                    bubble.classList.add(config.colors[i]);
                }
                
                // Set random horizontal position
                const leftPosition = Math.random() * 90 + 5;
                bubble.style.left = leftPosition + '%';
                
                // Optimized animation delay - reduced range
                const delay = Math.random() * 10; // Reduced from 20 to 10 seconds
                bubble.style.animationDelay = delay + 's';
                
                // Optimized animation duration - faster animations
                let baseDuration;
                switch (config.size) {
                    case 'large': baseDuration = 12; break; // Reduced from 18
                    case 'medium': baseDuration = 9; break;  // Reduced from 13
                    case 'small': baseDuration = 6; break;   // Reduced from 8
                    case 'tiny': baseDuration = 4; break;    // Reduced from 6
                    default: baseDuration = 8;
                }
                
                const duration = baseDuration + (Math.random() * 3 - 1.5); // Reduced variation
                bubble.style.animationDuration = duration + 's';
                
                // Add performance optimizations
                bubble.style.willChange = 'transform';
                bubble.style.transform = 'translateZ(0)'; // Force hardware acceleration
                
                gameContainer.appendChild(bubble);
            }
        });
        
        // Create fewer additional random bubbles
        for (let i = 0; i < 4; i++) { // Reduced from 8 to 4
            const bubble = document.createElement('div');
            const sizes = ['tiny', 'small']; // Removed 'medium' for better performance
            const colors = ['', 'purple', 'blue'];
            const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            
            bubble.className = `bubble ${randomSize}`;
            if (randomColor) {
                bubble.classList.add(randomColor);
            }
            
            // Optimized random positioning and timing
            bubble.style.left = (Math.random() * 90 + 5) + '%';
            bubble.style.animationDelay = (Math.random() * 12) + 's'; // Reduced from 25
            bubble.style.animationDuration = (Math.random() * 4 + 4) + 's'; // Reduced from 8+6
            
            // Add performance optimizations
            bubble.style.willChange = 'transform';
            bubble.style.transform = 'translateZ(0)';
            
            gameContainer.appendChild(bubble);
        }
        
        console.log('Optimized animated bubbles created successfully!');
    }
    
    
    
    // Fonction pour démarrer le jeu
    function startGame() {
        // Réinitialiser les variables
        cards = [];
        selectedCards = [];
        matchedPairs = 0;
        moves = 0;
        gameActive = true;
        gameBoard.innerHTML = '';
        loader.removeAttribute('style');

        
        // Mettre à jour l'affichage
        movesCount.textContent = moves;
        pairsCount.textContent = `0/${totalPairs}`;
        timerDisplay.textContent = '00:00';
        
        // Charger les cartes
        loadCards();
        
        
        // Afficher l'écran de jeu actif
        preGameScreen.classList.remove('active');
        activeGameScreen.classList.add('active');
        postGameScreen.classList.remove('active');
    }
    
    // Fonction pour charger les cartes
    function loadCards() {
        // Faire la requête API pour obtenir les cartes
        fetch(`/games/flashMatch/cards?package=${packageId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Données reçues:", data);
            
            if (data.error) {
                console.error(data.error);
                return;
            }
            
            if (!data.cards || !Array.isArray(data.cards) || data.cards.length === 0) {
                throw new Error('Aucune carte disponible');
            }
            
            // Mettre à jour le nombre total de paires
            totalPairs = data.cards.length / 2;
            pairsCount.textContent = `0/${totalPairs}`;
            
                    
            //Hide loader
            loader.setAttribute('style', 'display: none;');

            createGameBoard(data.cards);

            // Démarrer le timer
            startTime = Date.now();
            timerInterval = setInterval(updateTimer, 1000);
        })
        .catch(error => {
            console.error('Erreur lors du chargement des cartes:', error);
        });
    }
    
    // Fonction pour créer le plateau de jeu
    function createGameBoard(cardData) {
        
        // Mélanger les cartes
        const shuffledCards = shuffleArray([...cardData]);
        
        // Créer les éléments de carte
        shuffledCards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card-container';
            cardElement.dataset.index = index;
            
            const cardInner = document.createElement('div');
            cardInner.className = 'card-inner';
            
            const cardFront = document.createElement('div');
            cardFront.className = 'card-front';
            
            const cardBack = document.createElement('div');
            cardBack.className = 'card-back';
            if (card.type === 'meaning') {
                const meaningCard = document.createElement('div');
                meaningCard.className = 'meaning-card';
                meaningCard.textContent = card.content;
                cardBack.appendChild(meaningCard);
            } else {
                const wordCard = document.createElement('div');
                wordCard.className = 'card-word';
                wordCard.textContent = card.content;
                cardBack.appendChild(wordCard);
            }
            
            cardInner.appendChild(cardFront);
            cardInner.appendChild(cardBack);
            cardElement.appendChild(cardInner);
            
            // Ajouter l'événement de clic
            cardElement.addEventListener('click', () => flipCard(cardElement, card, index));
            
            // Ajouter au plateau
            gameBoard.appendChild(cardElement);
            cards.push({
                element: cardElement,
                data: card,
                flipped: false,
                matched: false
            });
        });
        
        // Appliquer la grille en fonction du nombre de paires
        if (totalPairs <= 4) {
            gameBoard.className = 'game-board grid-4';
        } else if (totalPairs <= 8) {
            gameBoard.className = 'game-board grid-8';
        } else if (totalPairs <= 10) {
            gameBoard.className = 'game-board grid-10';
        } else if (totalPairs <= 12) {
            gameBoard.className = 'game-board grid-12';
        } else {
            gameBoard.className = 'game-board grid-15';
        }
    }
    
    // Fonction pour retourner une carte
    function flipCard(cardElement, cardData, index) {
        // Vérifier si le jeu est actif et si la carte n'est pas déjà retournée ou appariée
        if (!gameActive || cards[index].flipped || cards[index].matched) {
            return;
        }
        
        // Vérifier si deux cartes sont déjà retournées
        if (selectedCards.length === 2) {
            return;
        }
        
        // Retourner la carte
        cardElement.classList.add('flipped');
        cards[index].flipped = true;
        
        // Ajouter la carte aux cartes sélectionnées
        selectedCards.push({
            index,
            pairId: cardData.pairId,
            type: cardData.type
        });
        
        // Vérifier si deux cartes sont sélectionnées
        if (selectedCards.length === 2) {
            // Incrémenter le nombre de coups
            moves++;
            movesCount.textContent = moves;
            
            // Vérifier si les cartes forment une paire
            setTimeout(checkMatch, 1000);
        }
    }
    
    // Fonction pour vérifier si les cartes forment une paire
    function checkMatch() {
        const card1 = selectedCards[0];
        const card2 = selectedCards[1];

        
        if (card1.pairId === card2.pairId && card1.type !== card2.type) {
            // Les cartes forment une paire
            cards[card1.index].matched = true;
            cards[card2.index].matched = true;
            
            // Marquer les cartes comme appariées
            cards[card1.index].element.classList.add('matched');
            cards[card2.index].element.classList.add('matched');
            
            matchedPairs++;
            
            if (pairsCount) pairsCount.textContent = `${matchedPairs}/${totalPairs}`;
            
            // Vérifier si toutes les paires ont été trouvées
            if (matchedPairs === totalPairs) {
                console.log('All pairs matched! Ending game...');
                endGame();
            }
        } else {
            // Les cartes ne forment pas une paire
            cards[card1.index].flipped = false;
            cards[card2.index].flipped = false;
            
            // Retourner les cartes
            cards[card1.index].element.classList.remove('flipped');
            cards[card2.index].element.classList.remove('flipped');
            
            console.log('No match found');
        }
        
        // Réinitialiser les cartes sélectionnées
        selectedCards = [];
    }
    
    // Fonction pour mettre à jour le timer
    function updateTimer() {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        currentTime = elapsed;
        
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Fonction pour terminer le jeu
    function endGame() {
        console.log('Ending game...');
        gameActive = false;
        clearInterval(timerInterval);
        
        // Mettre à jour l'écran de fin de jeu
        if (finalScore) finalScore.textContent = matchedPairs;
        
        const minutes = Math.floor(currentTime / 60);
        const seconds = currentTime % 60;
        if (finalTime) finalTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (finalMoves) finalMoves.textContent = moves;
        
        // Check if game was completed successfully
        const successThreshold = Math.ceil(totalPairs * 0.8); // 80% success rate
        const isSuccessful = matchedPairs >= successThreshold;
        
        console.log('Game completion status:', isSuccessful, 'Matched pairs:', matchedPairs, 'Threshold:', successThreshold);
        
        // Track level progress
        trackLevelProgress(isSuccessful);
        
        // Enregistrer le score
        saveScore(matchedPairs);
        
        // Afficher le message de progression de niveau
        if (trackLevelMessage) {
            if (isSuccessful) {
                trackLevelMessage.textContent = 'Excellent travail ! Progressez les autres jeux de ce niveau 😍';
                trackLevelMessage.classList.remove('level-failed');
                trackLevelMessage.classList.add('level-completed');
            } else {
                trackLevelMessage.textContent = 'Bon courage ! Réessayer ce jeu pour améliorer vos compétences 🤧';
                trackLevelMessage.classList.remove('level-completed');
                trackLevelMessage.classList.add('level-failed');
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
    function saveScore(matchedPairs) {
        console.log('Saving score:', matchedPairs);
        fetch('/games/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                game_type: 'flash_match',
                score: matchedPairs,
                details: {
                    pairs: totalPairs,
                    moves: moves,
                    time: currentTime
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
    
    // Fonction pour mélanger un tableau
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    // Fonction pour suivre la progression de niveau
    function trackLevelProgress(isSuccessful) {
        fetch(`/level-progress/track?package=${packageId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                game_type: 'flash_match',
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
        startGameBtn.addEventListener('click', startGame);
    }
    
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', startGame);
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
    
    // Fonction de test pour forcer l'affichage de l'écran de fin (pour débogage)
    window.testEndGame = function() {
        console.log('Testing end game...');
        matchedPairs = totalPairs;
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

