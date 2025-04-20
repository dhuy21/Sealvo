document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si nous sommes sur la page du jeu FlashMatch
    if (!document.getElementById('game-board')) {
        // Nous ne sommes pas sur la page FlashMatch, ne pas exécuter le script
        return;
    }
    
    // Variables du jeu
    let cards = [];
    let selectedCards = [];
    let matchedPairs = 0;
    let totalPairs = 4; // Par défaut: facile
    let moves = 0;
    let score = 0;
    let gameActive = false;
    let timerInterval = null;
    let startTime = null;
    let currentTime = 0;
    let selectedDifficulty = 'easy';
    
    // Éléments DOM
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
    const startGameBtn = document.getElementById('start-game');
    const gameBoard = document.getElementById('game-board');
    const movesCount = document.getElementById('moves-count');
    const pairsCount = document.getElementById('pairs-count');
    const timerDisplay = document.getElementById('timer');
    const playAgainBtn = document.getElementById('play-again');
    const finalScore = document.getElementById('final-score');
    const finalTime = document.getElementById('final-time');
    const finalMoves = document.getElementById('final-moves');
    const highScoreMessage = document.getElementById('high-score-message');
    
    // Écrans de jeu
    const preGameScreen = document.querySelector('.pre-game-screen');
    const activeGameScreen = document.querySelector('.active-game-screen');
    const postGameScreen = document.querySelector('.post-game-screen');
    
    // Initialisation de la difficulté
    if (difficultyBtns.length > 0) {
        difficultyBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                difficultyBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                selectedDifficulty = this.dataset.difficulty;
                totalPairs = parseInt(this.dataset.pairs);
            });
        });
    }
    
    // Fonction pour démarrer le jeu
    function startGame() {
        // Réinitialiser les variables
        cards = [];
        selectedCards = [];
        matchedPairs = 0;
        moves = 0;
        score = 0;
        gameActive = true;
        
        // Mettre à jour l'affichage
        movesCount.textContent = moves;
        pairsCount.textContent = `0/${totalPairs}`;
        timerDisplay.textContent = '00:00';
        
        // Charger les cartes
        loadCards();
        
        // Démarrer le timer
        startTime = Date.now();
        timerInterval = setInterval(updateTimer, 1000);
        
        // Afficher l'écran de jeu actif
        preGameScreen.classList.remove('active');
        activeGameScreen.classList.add('active');
        postGameScreen.classList.remove('active');
    }
    
    // Fonction pour charger les cartes
    function loadCards() {
        // Simuler une requête à l'API pour obtenir les mots et les définitions
        // Dans une vraie implémentation, vous feriez un appel fetch à votre API
        fetch(`/games/flashMatch/cards?difficulty=${selectedDifficulty}`, {
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
            
            createGameBoard(data.cards);
        })
        .catch(error => {
            console.error('Erreur lors du chargement des cartes:', error);
        });
    }
    
    // Fonction pour créer le plateau de jeu
    function createGameBoard(cardData) {
        // Vider le plateau
        gameBoard.innerHTML = '';
        cards = [];
        
        // Mélanger les cartes
        const shuffledCards = shuffleArray([...cardData]);
        
        // Créer les éléments de carte
        shuffledCards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.index = index;
            
            const cardInner = document.createElement('div');
            cardInner.className = 'card-inner';
            
            const cardFront = document.createElement('div');
            cardFront.className = 'card-front';
            
            const cardBack = document.createElement('div');
            cardBack.className = 'card-back';
            cardBack.textContent = card.content;
            if (card.type === 'meaning') {
                cardBack.classList.add('meaning-card');
            } else {
                cardBack.classList.add('word-card');
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
        let gridClass = '';
        if (totalPairs === 4) {
            gridClass = 'grid-4';
        } else if (totalPairs === 6) {
            gridClass = 'grid-6';
        } else {
            gridClass = 'grid-8';
        }
        gameBoard.className = `game-board ${gridClass}`;
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
            pairsCount.textContent = `${matchedPairs}/${totalPairs}`;
            
            // Vérifier si toutes les paires ont été trouvées
            if (matchedPairs === totalPairs) {
                endGame();
            }
        } else {
            // Les cartes ne forment pas une paire
            cards[card1.index].flipped = false;
            cards[card2.index].flipped = false;
            
            // Retourner les cartes
            cards[card1.index].element.classList.remove('flipped');
            cards[card2.index].element.classList.remove('flipped');
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
        gameActive = false;
        clearInterval(timerInterval);
        
        // Calculer le score
        // Formule: (totalPairs * 100) * (totalPairs / moves) * (totalPairs * 10 / elapsedTime)
        // Cette formule récompense: plus de paires, moins de coups, moins de temps
        const timeBonus = Math.max(1, totalPairs * 10 / currentTime);
        const movesBonus = Math.max(0.1, totalPairs / moves);
        score = Math.floor((totalPairs * 100) * movesBonus * timeBonus);
        
        // Mettre à jour l'écran de fin de jeu
        finalScore.textContent = score;
        
        const minutes = Math.floor(currentTime / 60);
        const seconds = currentTime % 60;
        finalTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        finalMoves.textContent = moves;
        
        // Vérifier si c'est un nouveau record
        // Récupérer le highScore depuis un élément data ou une variable globale
        const currentHighScore = document.getElementById('game-container').dataset.highScore || 0;
        if (score > currentHighScore) {
            highScoreMessage.textContent = 'Nouveau record personnel !';
            highScoreMessage.classList.add('new-record');
            
            // Enregistrer le score
            saveScore(score);
        }
        
        // Afficher l'écran de fin de jeu
        setTimeout(() => {
            activeGameScreen.classList.remove('active');
            postGameScreen.classList.add('active');
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
                game_type: 'flash_match',
                score: score,
                details: {
                    difficulty: selectedDifficulty,
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
    
    // Événements
    if (startGameBtn) {
        startGameBtn.addEventListener('click', startGame);
    }
    
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', startGame);
    }
});
