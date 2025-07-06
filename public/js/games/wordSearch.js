/**
 * WordSearch Game
 * Jeu de recherche de mots dans une grille
 */
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si nous sommes sur la page du jeu Word Search
    // On vérifie un élément unique qui n'existe que sur cette page
    
    // Éléments du DOM
    const gameContainer = document.getElementById('game-container');
    const preGameScreen = document.querySelector('.pre-game-screen');
    const activeGameScreen = document.querySelector('.active-game-screen');
    const postGameScreen = document.querySelector('.post-game-screen');
    const startGameBtn = document.getElementById('start-game');
    const wordSearchGrid = document.getElementById('word-search-grid');
    const wordList = document.getElementById('word-list');
    const scoreDisplay = document.getElementById('score');
    const timerDisplay = document.getElementById('timer');
    const wordsFoundDisplay = document.getElementById('words-found');
    const totalWordsDisplay = document.getElementById('total-words');
    const finalScoreDisplay = document.getElementById('final-score');
    const finalWordsFoundDisplay = document.getElementById('final-words-found');
    const finalTotalWordsDisplay = document.getElementById('final-total-words');
    const accuracyDisplay = document.getElementById('accuracy');
    const avgTimeDisplay = document.getElementById('avg-time');
    const highScoreMessage = document.getElementById('high-score-message');
    const playAgainBtn = document.getElementById('play-again');
    const showHintBtn = document.getElementById('show-hint');
    const packageId = document.getElementById('package-id').getAttribute('data-package');
  
    
    // Letter explosion background variables
    let letterExplosionBackground = null;
    let letterAnimationIntervals = [];
    
    // Variables du jeu
    let gridSize = 8;
    let grid = [];
    let words = [];
    let foundWords = [];
    let score = 0;
    let timer = 600;
    let gameTimer = null;
    let startTime = 0;
    let attempts = 0;
    let selectedCells = [];
    let gameActive = false;
    // Détection du type d'appareil mobile
    let isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    let isSelecting = false;
    // Récupération du high score en sécurisant l'accès à gameContainer
    let highScore = gameContainer && gameContainer.dataset ? (gameContainer.dataset.highScore || 0) : 0;
    
    // Direction des mots (horizontal, vertical, diagonal)
    const directions = [
        [0, 1],   // Droite
        [1, 0],   // Bas
        [1, 1],   // Diagonal bas-droite
        [1, -1],  // Diagonal bas-gauche
        [0, -1],  // Gauche
        [-1, 0],  // Haut
        [-1, 1],  // Diagonal haut-droite
        [-1, -1]  // Diagonal haut-gauche
    ];
    
    // Letter explosion background functions
    function initializeLetterExplosionBackground() {
        
        // Clean up any existing background
        if (letterExplosionBackground && letterExplosionBackground.parentNode) {
            letterExplosionBackground.parentNode.removeChild(letterExplosionBackground);
        }
        
        // Create background container
        letterExplosionBackground = document.createElement('div');
        letterExplosionBackground.className = 'letter-explosion-background';
        letterExplosionBackground.style.position = 'fixed';
        letterExplosionBackground.style.top = '0';
        letterExplosionBackground.style.left = '0';
        letterExplosionBackground.style.width = '100%';
        letterExplosionBackground.style.height = '100%';
        letterExplosionBackground.style.pointerEvents = 'none';
        letterExplosionBackground.style.zIndex = '-1';
        letterExplosionBackground.style.overflow = 'hidden';
        document.body.appendChild(letterExplosionBackground);
        
        // Add letter explosion mode to game container
        if (gameContainer) {
            gameContainer.classList.add('letter-explosion-mode');
        }
        
        // Start background letter animations
        startBackgroundLetterAnimations();
        
        // Create immediate welcome explosion sequence
        setTimeout(() => {
            createRandomLetterBurst();
        }, 500);
        
        setTimeout(() => {
            createRandomExplodingLetters();
        }, 1200);
        
        setTimeout(() => {
            createRandomSpiralLetters();
        }, 2000);
    }
    
    function startBackgroundLetterAnimations() {
        console.log('Starting background letter animations...');
        
        // Clear any existing intervals
        letterAnimationIntervals.forEach(interval => clearInterval(interval));
        letterAnimationIntervals = [];
        
        // More frequent letter bursts for automatic effect
        const burstInterval = setInterval(() => {
            console.log('Creating letter burst...');
            createRandomLetterBurst();
        }, 1500 + Math.random() * 2000); // Every 1.5-3.5 seconds (more frequent)
        
        // Add exploding letters at random intervals
        const explodingInterval = setInterval(() => {
            console.log('Creating exploding letters...');
            createRandomExplodingLetters();
        }, 2000 + Math.random() * 3000); // Every 2-5 seconds
        
        // Add spiral letters occasionally
        const spiralInterval = setInterval(() => {
            console.log('Creating spiral letters...');
            createRandomSpiralLetters();
        }, 4000 + Math.random() * 4000); // Every 4-8 seconds
        
        letterAnimationIntervals.push(burstInterval, explodingInterval, spiralInterval);
        
        // Create immediate explosion when starting
        setTimeout(() => {
            createRandomLetterBurst();
        }, 500);
        
        setTimeout(() => {
            createRandomExplodingLetters();
        }, 1000);
    }
    
    function createRandomLetterBurst() {
        if (!letterExplosionBackground) return;
        
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numberOfLetters = 5 + Math.floor(Math.random() * 8); // 5-12 letters
        
        // Random center position
        const centerX = 20 + Math.random() * 60; // 20% to 80% of screen width
        const centerY = 20 + Math.random() * 60; // 20% to 80% of screen height
        
        for (let i = 0; i < numberOfLetters; i++) {
            const letter = letters[Math.floor(Math.random() * letters.length)];
            const letterElement = document.createElement('div');
            letterElement.className = 'letter-burst';
            letterElement.textContent = letter;
            
            letterElement.style.left = centerX + '%';
            letterElement.style.top = centerY + '%';
            
            // Random burst direction
            const burstX = (Math.random() - 0.5) * 300; // -150px to 150px
            const burstY = (Math.random() - 0.5) * 300; // -150px to 150px
            letterElement.style.setProperty('--burst-x', burstX + 'px');
            letterElement.style.setProperty('--burst-y', burstY + 'px');
            
            // Random colors
            const colors = [
                'rgba(239, 68, 68, 0.6)',
                'rgba(245, 158, 11, 0.6)',
                'rgba(34, 197, 94, 0.6)',
                'rgba(99, 102, 241, 0.6)',
                'rgba(139, 92, 246, 0.6)'
            ];
            letterElement.style.color = colors[Math.floor(Math.random() * colors.length)];
            
            letterExplosionBackground.appendChild(letterElement);
            
            // Remove after animation
            setTimeout(() => {
                if (letterElement.parentNode) {
                    letterElement.parentNode.removeChild(letterElement);
                }
            }, 2000);
        }
    }
    
    function createRandomExplodingLetters() {
        if (!letterExplosionBackground) return;
        
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numberOfLetters = 3 + Math.floor(Math.random() * 5); // 3-7 letters
        
        for (let i = 0; i < numberOfLetters; i++) {
            setTimeout(() => {
                const letter = letters[Math.floor(Math.random() * letters.length)];
                const letterElement = document.createElement('div');
                letterElement.className = 'exploding-letter';
                letterElement.textContent = letter;
                
                // Random position across the screen
                letterElement.style.left = Math.random() * 100 + '%';
                letterElement.style.top = Math.random() * 100 + '%';
                
                letterExplosionBackground.appendChild(letterElement);
                
                // Remove after animation
                setTimeout(() => {
                    if (letterElement.parentNode) {
                        letterElement.parentNode.removeChild(letterElement);
                    }
                }, 3000);
            }, i * 200); // Stagger the letters
        }
    }
    
    function createRandomSpiralLetters() {
        if (!letterExplosionBackground) return;
        
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numberOfLetters = 2 + Math.random() * 4; // 2-5 letters
        
        for (let i = 0; i < numberOfLetters; i++) {
            setTimeout(() => {
                const letter = letters[Math.floor(Math.random() * letters.length)];
                const letterElement = document.createElement('div');
                letterElement.className = 'letter-spiral';
                letterElement.textContent = letter;
                
                // Random position
                letterElement.style.left = (20 + Math.random() * 60) + '%';
                letterElement.style.top = (20 + Math.random() * 60) + '%';
                
                // Random colors for spiral
                const colors = [
                    'rgba(239, 68, 68, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(34, 197, 94, 0.7)',
                    'rgba(99, 102, 241, 0.7)',
                    'rgba(139, 92, 246, 0.7)',
                    'rgba(236, 72, 153, 0.7)'
                ];
                letterElement.style.color = colors[Math.floor(Math.random() * colors.length)];
                
                letterExplosionBackground.appendChild(letterElement);
                
                // Remove after animation
                setTimeout(() => {
                    if (letterElement.parentNode) {
                        letterElement.parentNode.removeChild(letterElement);
                    }
                }, 4000);
            }, i * 300); // Stagger the letters
        }
    }
    
    function createWordFoundExplosion(word, centerX, centerY) {
        if (!letterExplosionBackground) return;
        
        // Create explosion trigger effect
        const trigger = document.createElement('div');
        trigger.className = 'letter-explosion-trigger';
        trigger.style.left = centerX + 'px';
        trigger.style.top = centerY + 'px';
        letterExplosionBackground.appendChild(trigger);
        
        setTimeout(() => {
            if (trigger.parentNode) {
                trigger.parentNode.removeChild(trigger);
            }
        }, 1000);
        
        // Create letter celebration for each letter in the word
        const letters = word.toUpperCase().split('');
        letters.forEach((letter, index) => {
            setTimeout(() => {
                const letterElement = document.createElement('div');
                letterElement.className = 'word-found-letter-celebration';
                letterElement.textContent = letter;
                
                // Position around the center with some randomness
                const angle = (index / letters.length) * 2 * Math.PI;
                const radius = 50 + Math.random() * 30;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                letterElement.style.left = x + 'px';
                letterElement.style.top = y + 'px';
                
                letterExplosionBackground.appendChild(letterElement);
                
                // Remove after animation
                setTimeout(() => {
                    if (letterElement.parentNode) {
                        letterElement.parentNode.removeChild(letterElement);
                    }
                }, 2000);
            }, index * 100); // Stagger each letter
        });
        
        // Create additional spiral letters
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const randomLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
                const letterElement = document.createElement('div');
                letterElement.className = 'letter-spiral';
                letterElement.textContent = randomLetter;
                
                letterElement.style.left = (centerX + (Math.random() - 0.5) * 100) + 'px';
                letterElement.style.top = (centerY + (Math.random() - 0.5) * 100) + 'px';
                
                // Random colors for celebration
                const celebrationColors = [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(5, 150, 105, 0.8)',
                    'rgba(52, 211, 153, 0.8)'
                ];
                letterElement.style.color = celebrationColors[Math.floor(Math.random() * celebrationColors.length)];
                
                letterExplosionBackground.appendChild(letterElement);
                
                // Remove after animation
                setTimeout(() => {
                    if (letterElement.parentNode) {
                        letterElement.parentNode.removeChild(letterElement);
                    }
                }, 4000);
            }, i * 150);
        }
    }
    
    function createGameStartExplosion() {
        if (!letterExplosionBackground) return;
        
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numberOfLetters = 20;
        
        for (let i = 0; i < numberOfLetters; i++) {
            setTimeout(() => {
                const letter = letters[Math.floor(Math.random() * letters.length)];
                const letterElement = document.createElement('div');
                letterElement.className = 'exploding-letter';
                letterElement.textContent = letter;
                
                // Random position across the screen
                letterElement.style.left = Math.random() * 100 + '%';
                letterElement.style.top = Math.random() * 100 + '%';
                
                letterExplosionBackground.appendChild(letterElement);
                
                // Remove after animation
                setTimeout(() => {
                    if (letterElement.parentNode) {
                        letterElement.parentNode.removeChild(letterElement);
                    }
                }, 3000);
            }, i * 100);
        }
    }
    
    function cleanupLetterAnimations() {
        // Clear all intervals
        letterAnimationIntervals.forEach(interval => clearInterval(interval));
        letterAnimationIntervals = [];
        
        // Remove background container
        if (letterExplosionBackground && letterExplosionBackground.parentNode) {
            letterExplosionBackground.parentNode.removeChild(letterExplosionBackground);
            letterExplosionBackground = null;
        }
        
        // Remove letter explosion mode from game container
        if (gameContainer) {
            gameContainer.classList.remove('letter-explosion-mode');
        }
    }
    
    // Initialisation
    function init() {
        
        // Initialize letter explosion background
        initializeLetterExplosionBackground();
        
        // Ajouter les événements avec support iOS Safari
        if (startGameBtn) {
        startGameBtn.addEventListener('click', startGame);
            // Add touch support for iOS Safari
            if (isTouchDevice) {
                startGameBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    startGame();
                });
            }
        }
        
        if (showHintBtn) {
        showHintBtn.addEventListener('click', showHint);
            // Add touch support for iOS Safari
            if (isTouchDevice) {
                showHintBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    showHint();
                });
            }
            
            // Ensure button is properly styled for iOS Safari
            showHintBtn.style.webkitTapHighlightColor = 'transparent';
            showHintBtn.style.webkitUserSelect = 'none';
            showHintBtn.style.userSelect = 'none';
            showHintBtn.style.webkitTouchCallout = 'none';
        }
        
        // Add iOS Safari touch support for next-btn anchor tag
        const nextBtn = document.querySelector('.next-btn');
        if (nextBtn && isTouchDevice) {
            // Ensure proper iOS Safari styling
            nextBtn.style.webkitTapHighlightColor = 'transparent';
            nextBtn.style.webkitUserSelect = 'none';
            nextBtn.style.userSelect = 'none';
            nextBtn.style.webkitTouchCallout = 'none';
            nextBtn.style.touchAction = 'manipulation';
            
            // Add touch event listeners for iOS Safari
            nextBtn.addEventListener('touchstart', (e) => {
                nextBtn.classList.add('touch-active');
            }, { passive: true });
            
            nextBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                nextBtn.classList.remove('touch-active');
                
                // Navigate to the href after a short delay to ensure visual feedback
                setTimeout(() => {
                    window.location.href = nextBtn.href;
                }, 100);
            }, { passive: false });
            
            nextBtn.addEventListener('touchcancel', (e) => {
                nextBtn.classList.remove('touch-active');
            }, { passive: true });
        }
        
        // Add iOS Safari touch support for all footer navigation buttons
        const footerBtns = document.querySelectorAll('.game-footer .btn');
        footerBtns.forEach(btn => {
            if (btn && isTouchDevice) {
                // Ensure proper iOS Safari styling
                btn.style.webkitTapHighlightColor = 'transparent';
                btn.style.webkitUserSelect = 'none';
                btn.style.userSelect = 'none';
                btn.style.webkitTouchCallout = 'none';
                btn.style.touchAction = 'manipulation';
                
                // Add touch event listeners for iOS Safari
                btn.addEventListener('touchstart', (e) => {
                    btn.classList.add('touch-active');
                }, { passive: true });
                
                btn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    btn.classList.remove('touch-active');
                    
                    // Navigate to the href after a short delay to ensure visual feedback
                    setTimeout(() => {
                        window.location.href = btn.href;
                    }, 100);
                }, { passive: false });
                
                btn.addEventListener('touchcancel', (e) => {
                    btn.classList.remove('touch-active');
                }, { passive: true });
            }
        });
        
    }
    
    // Démarrer le jeu
    async function startGame() {
        try {
            // Create game start explosion
            createGameStartExplosion();
            
            // Changer l'interface pour l'écran de jeu
            preGameScreen.classList.remove('active');
            activeGameScreen.classList.add('active');
            activeGameScreen.style.display = 'block';
            
            // Définir l'état du jeu
            gameActive = true;
            score = 0;
            foundWords = [];
            selectedCells = [];
            attempts = 0;
            startTime = Date.now();
            
            // Charger les mots depuis le serveur
            const response = await fetch(`/games/wordSearch/words?package=${packageId}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors du chargement des mots');
            }
            
            words = data.words;
            gridSize = data.gridSize;
            
            // Mettre à jour l'affichage
            scoreDisplay.textContent = score;
            wordsFoundDisplay.textContent =  foundWords.length + ' / ';
            totalWordsDisplay.textContent = words.length;
            
            timerDisplay.textContent = timer;
            
            // Générer la grille et afficher la liste des mots
            generateGrid();
            displayWordList();
            
            // Démarrer le timer
            gameTimer = setInterval(() => {
                timer--;
                timerDisplay.textContent = timer;
                
                if (timer <= 0 || foundWords.length >= words.length) {
                    endGame();
                }
            }, 1000);
            
        } catch (error) {
            console.error('Erreur lors du démarrage du jeu:', error);
            alert('Une erreur est survenue lors du démarrage du jeu. Veuillez réessayer.');
            resetGame();
        }
    }
    
    // Générer la grille de lettres
    function generateGrid() {
        // Créer une grille vide
        grid = Array(gridSize).fill().map(() => Array(gridSize).fill(''));
        
        // Placer les mots dans la grille
        for (const wordObj of words) {
            const word = wordObj.word.toUpperCase().replace(/[^A-Z]/g, '');
            
            if (word.length <= 1) continue;
            
            let placed = false;
            let attempts = 0;
            const maxAttempts = 100;
            
            while (!placed && attempts < maxAttempts) {
                // Choisir une direction aléatoire
                const dirIndex = Math.floor(Math.random() * directions.length);
                const [dx, dy] = directions[dirIndex];
                
                // Choisir une position de départ aléatoire
                let row = Math.floor(Math.random() * gridSize);
                let col = Math.floor(Math.random() * gridSize);
                
                // Vérifier si le mot peut être placé à partir de cette position
                if (canPlaceWord(word, row, col, dx, dy)) {
                    placeWord(word, row, col, dx, dy);
                    placed = true;
                }
                
                attempts++;
            }
        }
        
        // Remplir les cases vides avec des lettres aléatoires
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (grid[i][j] === '') {
                    grid[i][j] = getRandomLetter();
                }
            }
        }
        
        // Afficher la grille dans le DOM
        displayGrid();
    }
    
    // Vérifier si un mot peut être placé à une position donnée
    function canPlaceWord(word, row, col, dx, dy) {
        const wordLength = word.length;
        
        // Vérifier que le mot ne sort pas de la grille
        if (
            row + dx * (wordLength - 1) < 0 || 
            row + dx * (wordLength - 1) >= gridSize ||
            col + dy * (wordLength - 1) < 0 || 
            col + dy * (wordLength - 1) >= gridSize
        ) {
            return false;
        }
        
        // Vérifier que les cases sont vides ou contiennent la même lettre
        for (let i = 0; i < wordLength; i++) {
            const newRow = row + dx * i;
            const newCol = col + dy * i;
            
            if (grid[newRow][newCol] !== '' && grid[newRow][newCol] !== word[i]) {
                return false;
            }
        }
        
        return true;
    }
    
    // Placer un mot dans la grille
    function placeWord(word, row, col, dx, dy) {
        const wordLength = word.length;
        
        for (let i = 0; i < wordLength; i++) {
            const newRow = row + dx * i;
            const newCol = col + dy * i;
            grid[newRow][newCol] = word[i];
        }
    }
    
    // Obtenir une lettre aléatoire
    function getRandomLetter() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return letters.charAt(Math.floor(Math.random() * letters.length));
    }
    
    // Afficher la grille dans le DOM
    function displayGrid() {
        // Créer un conteneur pour la grille avec défilement
        const gridContainer = document.createElement('div');
        gridContainer.className = 'word-search-grid-container';
        
        // Créer la grille
        wordSearchGrid.innerHTML = '';
        wordSearchGrid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.dataset.row = i;
                cell.dataset.col = j;
                cell.textContent = grid[i][j];
                
                // Ajouter l'événement au clic sur une cellule
                cell.addEventListener('mousedown', startSelection);
                cell.addEventListener('mouseover', handleMouseOver);
                cell.addEventListener('mouseup', endSelection);
                
                // Ajouter les événements tactiles pour mobiles
                if (isTouchDevice) {
                    cell.addEventListener('touchstart', handleTouchStart, { passive: false });
                    cell.addEventListener('touchmove', handleTouchMove, { passive: false });
                    cell.addEventListener('touchend', handleTouchEnd, { passive: false });
                }
                
                wordSearchGrid.appendChild(cell);
            }
        }
        
        // Vider le contenu actuel du game-board
        const gameBoard = document.querySelector('.game-board');
        if (gameBoard) {
            gameBoard.innerHTML = '';
            
            // Ajouter la grille au conteneur
            gridContainer.appendChild(wordSearchGrid);
            
            // Ajouter le conteneur au game-board
            gameBoard.appendChild(gridContainer);
        }
        
        // Ajouter un événement pour annuler la sélection si on sort de la grille
        document.addEventListener('mouseup', endSelection);
        
        // Pour les appareils tactiles
        if (isTouchDevice) {
            document.addEventListener('touchend', handleTouchEnd);
        }

        // Prévenir le zoom ou le scroll lors du toucher sur la grille
        if (isTouchDevice) {
            wordSearchGrid.addEventListener('touchmove', function(e) {
                if (isSelecting) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
    }
    
    // Gestion des événements tactiles
    function handleTouchStart(event) {
        event.preventDefault();
        isSelecting = true;
        
        const touch = event.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (element && element.classList.contains('grid-cell')) {
            startSelection({
                target: element,
                preventDefault: () => {}
            });
        }
    }
    
    function handleTouchMove(event) {
        if (!isSelecting) return;
        event.preventDefault();
        
        const touch = event.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (element && element.classList.contains('grid-cell')) {
            handleMouseOver({
                target: element,
                preventDefault: () => {}
            });
        }
    }
    
    function handleTouchEnd(event) {
        event.preventDefault();
        isSelecting = false;
        endSelection();
    }
    
    // Commencer la sélection
    function startSelection(event) {
        if (!gameActive) return;
        
        // Effacer les sélections précédentes
        clearSelectedCells();
        
        // Obtenir la position de la cellule
        const row = parseInt(event.target.dataset.row);
        const col = parseInt(event.target.dataset.col);
        
        // Ajouter la cellule à la sélection
        selectedCells.push({ row, col, element: event.target });
        event.target.classList.add('selected');
    }
    
    // Gérer le survol des cellules
    function handleMouseOver(event) {
        if (!gameActive || selectedCells.length === 0) return;
        
        // Obtenir la position de la cellule
        const row = parseInt(event.target.dataset.row);
        const col = parseInt(event.target.dataset.col);
        
        // Vérifier si cette cellule est adjacente à la dernière sélectionnée
        const lastCell = selectedCells[selectedCells.length - 1];
        
        // Vérifier si la cellule est déjà sélectionnée
        const isAlreadySelected = selectedCells.some(cell => cell.row === row && cell.col === col);
        
        if (isAlreadySelected) {
            // Si on revient en arrière, supprimez toutes les cellules après celle-ci
            const index = selectedCells.findIndex(cell => cell.row === row && cell.col === col);
            if (index !== -1 && index < selectedCells.length - 1) {
                const cellsToRemove = selectedCells.splice(index + 1);
                cellsToRemove.forEach(cell => cell.element.classList.remove('selected'));
            }
            return;
        }
        
        // Vérifier si les cellules sont alignées (horizontale, verticale ou diagonale)
        const rowDiff = row - lastCell.row;
        const colDiff = col - lastCell.col;
        
        // Vérifier si la direction est l'une des directions valides
        const isValidDirection = directions.some(([dx, dy]) => 
            (dx === Math.sign(rowDiff) && dy === Math.sign(colDiff)) && 
            (Math.abs(rowDiff) === Math.abs(colDiff) || rowDiff === 0 || colDiff === 0)
        );
        
        // Si la direction n'est pas valide, ne rien faire
        if (!isValidDirection) return;
        
        // Vérifier si la cellule est ajdacente ou dans la bonne direction
        if (selectedCells.length > 1) {
            const firstCell = selectedCells[0];
            const dirX = Math.sign(lastCell.row - firstCell.row);
            const dirY = Math.sign(lastCell.col - firstCell.col);
            
            const newDirX = Math.sign(row - firstCell.row);
            const newDirY = Math.sign(col - firstCell.col);
            
            // Si la direction change, ne rien faire
            if (dirX !== 0 && newDirX !== dirX) return;
            if (dirY !== 0 && newDirY !== dirY) return;
            
            // Vérifier que la nouvelle cellule est dans le prolongement
            const isInLine = (dirX === 0 && newDirX === 0) || (dirY === 0 && newDirY === 0) || (Math.abs(row - firstCell.row) === Math.abs(col - firstCell.col));
            if (!isInLine) return;
        }
        
        // Ajouter la cellule à la sélection
        selectedCells.push({ row, col, element: event.target });
        event.target.classList.add('selected');
    }
    
    // Terminer la sélection
    function endSelection() {
        if (!gameActive || selectedCells.length === 0) return;
        
        // Vérifier si le mot sélectionné est valide
        const selectedWord = selectedCells.map(cell => grid[cell.row][cell.col]).join('');
        
        // Vérifier si le mot est dans la liste et n'a pas déjà été trouvé
        const foundWordIndex = words.findIndex(word => 
            word.word.toUpperCase().replace(/[^A-Z]/g, '') === selectedWord &&
            !foundWords.includes(word.word)
        );
        
        if (foundWordIndex !== -1) {
            // Mot trouvé
            const word = words[foundWordIndex].word;
            foundWords.push(word);
            
            // Mettre à jour l'UI
            updateWordFoundStyle(word);
            
            // Garder les cellules sélectionnées et les marquer comme trouvées
            selectedCells.forEach(cell => {
                cell.element.classList.add('found');
                cell.element.classList.remove('selected');
            });
            
            // Mettre à jour le score et les compteurs
            score += selectedWord.length * 10;
            scoreDisplay.textContent = score;
            wordsFoundDisplay.textContent = foundWords.length;
            
            // Vérifier si tous les mots ont été trouvés
            if (foundWords.length >= words.length) {
                endGame();
            }
        } else {
            // Mot non valide, réinitialiser la sélection
            clearSelectedCells();
            
            // Compter une tentative
            attempts++;
        }
        
        // Réinitialiser la sélection pour le prochain mot
        selectedCells = [];
        isSelecting = false;
    }
    
    // Effacer les cellules sélectionnées
    function clearSelectedCells() {
        selectedCells.forEach(cell => {
            cell.element.classList.remove('selected');
        });
        selectedCells = [];
    }
    
    // Afficher un indice
    function showHint() {
        
        if (!gameActive || foundWords.length >= words.length) {
            return;
        }
        
        // Trouver un mot qui n'a pas encore été trouvé
        const remainingWords = words.filter(word => !foundWords.includes(word.word));
        
        if (remainingWords.length === 0) {
            return;
        }
        
        // Choisir un mot aléatoire parmi les mots restants
        const randomWord = remainingWords[Math.floor(Math.random() * remainingWords.length)];
        const word = randomWord.word.toUpperCase().replace(/[^A-Z]/g, '');
        
        // Trouver la position du mot dans la grille
        let hintPosition = null;
        
        // Parcourir la grille pour trouver le mot
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                for (const [dx, dy] of directions) {
                    if (canReadWord(word, i, j, dx, dy)) {
                        hintPosition = { row: i, col: j, dx, dy, wordLength: word.length };
                        break;
                    }
                }
                if (hintPosition) break;
            }
            if (hintPosition) break;
        }
        
        if (hintPosition) {
            try {
                // Create hint notification for iOS Safari compatibility
                const hintNotification = document.createElement('div');
                hintNotification.className = 'hint-notification';
                hintNotification.innerHTML = `
                    <div class="hint-icon">💡</div>
                    <div class="hint-content">
                        <div class="hint-title">Indice</div>
                        <div class="hint-message">Regardez le mot <span>"${randomWord.word}"</span></div>
                    </div>
                `;
                
                // iOS Safari specific styles
                hintNotification.style.position = 'fixed';
                hintNotification.style.top = '20px';
                hintNotification.style.left = '50%';
                hintNotification.style.transform = 'translateX(-50%)';
                hintNotification.style.zIndex = '9999';
                hintNotification.style.backgroundColor = 'rgba(106, 17, 203, 0.95)';
                hintNotification.style.color = 'white';
                hintNotification.style.padding = '1rem 1.5rem';
                hintNotification.style.borderRadius = '12px';
                hintNotification.style.boxShadow = '0 10px 25px rgba(106, 17, 203, 0.3)';
                hintNotification.style.display = 'flex';
                hintNotification.style.alignItems = 'center';
                hintNotification.style.gap = '1rem';
                hintNotification.style.maxWidth = '90%';
                hintNotification.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                hintNotification.style.opacity = '0';
                hintNotification.style.transition = 'all 0.4s ease';
                hintNotification.style.pointerEvents = 'none';
                
                // Add to body for iOS Safari compatibility
                document.body.appendChild(hintNotification);
                
                // Force reflow for iOS Safari
                hintNotification.offsetHeight;
                
            // Animation d'entrée et de sortie pour la notification
            setTimeout(() => {
                    hintNotification.style.opacity = '1';
                    hintNotification.style.transform = 'translateX(-50%) translateY(0)';
            }, 100);
            
            setTimeout(() => {
                    hintNotification.style.opacity = '0';
                    hintNotification.style.transform = 'translateX(-50%) translateY(-20px)';
                setTimeout(() => {
                        if (hintNotification.parentNode) {
                            hintNotification.parentNode.removeChild(hintNotification);
                        }
                }, 500);
            }, 3000);
            
            // Déterminer le type d'indice à afficher (aléatoire entre 3 types)
            const hintType = Math.floor(Math.random() * 3);
            
            switch (hintType) {
                case 0: // Type 1: Montrer la première lettre
                    highlightFirstLetter(hintPosition);
                    break;
                case 1: // Type 2: Montrer la direction du mot
                    showDirectionHint(hintPosition);
                    break;
                case 2: // Type 3: Montrer un aperçu rapide du mot complet
                    flashEntireWord(hintPosition);
                    break;
            }
                
                // Réduire le score pour avoir utilisé un indice
                score = Math.max(0, score - 20);
                scoreDisplay.textContent = score;
                
            } catch (error) {
                console.error('Error in showHint function:', error);
                // Fallback: simple alert for iOS Safari
                alert(`Indice: Cherchez le mot "${randomWord.word}"`);
            }
        } else {
            console.warn('No hint position found for word:', word);
            }
        }
    
    // Mettre en évidence la première lettre comme indice
    function highlightFirstLetter(hintPosition) {
        const cell = document.querySelector(`.grid-cell[data-row="${hintPosition.row}"][data-col="${hintPosition.col}"]`);
        
        if (cell) {
            cell.classList.add('hint-pulse');
            setTimeout(() => {
                cell.classList.remove('hint-pulse');
            }, 2000);
        }
    }
    
    // Montrer la direction du mot comme indice
    function showDirectionHint(hintPosition) {
        const { row, col, dx, dy, wordLength } = hintPosition;
        
        // Mettre en évidence la première et la dernière lettre pour montrer la direction
        const firstCell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
        const lastCell = document.querySelector(`.grid-cell[data-row="${row + dx * (wordLength - 1)}"][data-col="${col + dy * (wordLength - 1)}"]`);
        
        if (firstCell && lastCell) {
            // Ajouter une flèche ou un effet visuel entre les deux cellules
            firstCell.classList.add('hint-start');
            lastCell.classList.add('hint-end');
            
            // Créer une ligne directionnelle entre les deux points
            const arrow = document.createElement('div');
            arrow.className = 'direction-arrow';
            
            try {
                // Positionner la flèche avec protection pour iOS Safari
            const firstRect = firstCell.getBoundingClientRect();
            const lastRect = lastCell.getBoundingClientRect();
            const gameBoard = document.querySelector('.game-board');
                
                if (!gameBoard) {
                    console.warn('Game board not found for hint arrow');
                    return;
                }
                
            const gameBoardRect = gameBoard.getBoundingClientRect();
            
                // Calcul pour positionner la flèche relativement au gameBoard avec protection iOS Safari
                const startX = Math.max(0, firstRect.left + firstRect.width / 2 - gameBoardRect.left);
                const startY = Math.max(0, firstRect.top + firstRect.height / 2 - gameBoardRect.top);
                const endX = Math.max(0, lastRect.left + lastRect.width / 2 - gameBoardRect.left);
                const endY = Math.max(0, lastRect.top + lastRect.height / 2 - gameBoardRect.top);
            
            // Calculer l'angle de la flèche
            const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
            
            // Calculer la longueur de la flèche
            const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            
                // Appliquer les styles à la flèche avec support iOS Safari
                arrow.style.position = 'absolute';
                arrow.style.width = `${Math.max(10, length)}px`;
                arrow.style.height = '3px';
                arrow.style.backgroundColor = '#ff6b6b';
            arrow.style.left = `${startX}px`;
            arrow.style.top = `${startY}px`;
            arrow.style.transform = `rotate(${angle}deg)`;
                arrow.style.transformOrigin = '0 50%';
                arrow.style.zIndex = '1000';
                arrow.style.borderRadius = '2px';
                arrow.style.boxShadow = '0 2px 4px rgba(255, 107, 107, 0.3)';
                arrow.style.opacity = '0';
                arrow.style.transition = 'opacity 0.3s ease';
                
                // iOS Safari specific styles
                arrow.style.webkitTransform = `rotate(${angle}deg)`;
                arrow.style.webkitTransformOrigin = '0 50%';
                arrow.style.webkitTransition = 'opacity 0.3s ease';
            
            gameBoard.appendChild(arrow);
                
                // Force reflow for iOS Safari
                arrow.offsetHeight;
                
                // Animate in
                setTimeout(() => {
                    arrow.style.opacity = '1';
                }, 50);
                
            } catch (error) {
                console.warn('Error positioning hint arrow on iOS Safari:', error);
            }
            
            // Supprimer les éléments d'indice après un délai
            setTimeout(() => {
                firstCell.classList.remove('hint-start');
                lastCell.classList.remove('hint-end');
                
                if (arrow.parentNode) {
                    arrow.style.opacity = '0';
                setTimeout(() => {
                        if (arrow.parentNode) {
                            arrow.parentNode.removeChild(arrow);
                        }
                    }, 300);
                }
            }, 2000);
        }
    }
    
    // Faire clignoter rapidement tout le mot comme indice
    function flashEntireWord(hintPosition) {
        const { row, col, dx, dy, wordLength } = hintPosition;
        const cells = [];
        
        // Collecter toutes les cellules composant le mot
        for (let i = 0; i < wordLength; i++) {
            const cellRow = row + dx * i;
            const cellCol = col + dy * i;
            const cell = document.querySelector(`.grid-cell[data-row="${cellRow}"][data-col="${cellCol}"]`);
            
            if (cell) {
                cells.push(cell);
            }
        }
        
        // Animation de clignotement rapide
        let flashCount = 0;
        const maxFlashes = 3;
        const flashInterval = setInterval(() => {
            cells.forEach(cell => {
                cell.classList.toggle('hint-flash');
            });
            
            flashCount++;
            
            if (flashCount >= maxFlashes * 2) {
                clearInterval(flashInterval);
                cells.forEach(cell => {
                    cell.classList.remove('hint-flash');
                });
            }
        }, 200);
    }
    
    // Vérifier si un mot peut être lu à partir d'une position
    function canReadWord(word, row, col, dx, dy) {
        const wordLength = word.length;
        
        if (row + dx * (wordLength - 1) < 0 || row + dx * (wordLength - 1) >= gridSize ||
            col + dy * (wordLength - 1) < 0 || col + dy * (wordLength - 1) >= gridSize) {
            return false;
        }
        
        for (let i = 0; i < wordLength; i++) {
            if (grid[row + dx * i][col + dy * i] !== word[i]) {
                return false;
            }
        }
        
        return true;
    }
    
    // Afficher la liste des mots à trouver
    function displayWordList() {
        wordList.innerHTML = '';
        wordList.classList.add('pretty-word-list');
        
        // Ajouter un titre pour la liste
        const listTitle = document.createElement('div');
        listTitle.className = 'word-list-title';
        listTitle.innerHTML = '<i class="fas fa-search"></i> Mots à trouver';
        wordList.appendChild(listTitle);
        
        // Diviser la liste en colonnes pour une meilleure présentation
        const wordContainer = document.createElement('div');
        wordContainer.className = 'word-items-container';
        wordList.appendChild(wordContainer);
        
        // Trier les mots par ordre alphabétique
        const sortedWords = [...words].sort((a, b) => a.word.localeCompare(b.word));
        
        sortedWords.forEach((wordObj, index) => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-item';
            wordItem.dataset.word = wordObj.word;
            
            // Créer un marqueur pour l'animation
            const wordMarker = document.createElement('span');
            wordMarker.className = 'word-marker';
            wordMarker.innerHTML = '<i class="fas fa-circle"></i>';
            
            // Créer l'élément pour le texte du mot
            const wordText = document.createElement('span');
            wordText.className = 'word-text';
            wordText.textContent = wordObj.word;
            
            // Assembler les éléments
            wordItem.appendChild(wordMarker);
            wordItem.appendChild(wordText);
            
            // Ajouter une animation de délai d'entrée basée sur l'index
            wordItem.style.animationDelay = `${index * 0.1}s`;
            
            wordContainer.appendChild(wordItem);
        });
        
        // Ajouter un compteur visuel de progression
        const progressCounter = document.createElement('div');
        progressCounter.className = 'word-progress';
        progressCounter.innerHTML = `
            <div class="progress-text">
                <span id="found-word-count">0</span>/${words.length}
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" id="word-progress-bar" style="width: 0%"></div>
            </div>
        `;
        wordList.appendChild(progressCounter);
    }
    
    // Mise à jour du style des mots trouvés
    function updateWordFoundStyle(word) {
        const wordElement = document.querySelector(`.word-item[data-word="${word}"]`);
        if (wordElement) {
            wordElement.classList.add('found');
            
            // Create word found explosion at the center of the screen
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            createWordFoundExplosion(word, centerX, centerY);
            
            // Mettre à jour le marqueur avec une coche
            const marker = wordElement.querySelector('.word-marker');
            if (marker) {
                marker.innerHTML = '<i class="fas fa-check-circle"></i>';
            }
            
            // Mettre à jour le compteur de progression
            const foundCount = document.getElementById('found-word-count');
            if (foundCount) {
                foundCount.textContent = foundWords.length;
            }
            
            // Mettre à jour la barre de progression
            const progressBar = document.getElementById('word-progress-bar');
            if (progressBar) {
                const progressPercent = (foundWords.length / words.length) * 100;
                progressBar.style.width = `${progressPercent}%`;
            }
        }
    }
    
    // Fin du jeu
    function endGame() {
        clearInterval(gameTimer);
        gameActive = false;
        
        // Calculer le temps écoulé
        const endTime = Date.now();
        const gameTime = Math.floor((endTime - startTime) / 1000);
        
        // Calculer le score final
        const finalScore = score + (timer > 0 ? timer : 0) * (foundWords.length / words.length);
        
        // Ajuster le score si tous les mots ont été trouvés
        const bonusScore = foundWords.length === words.length ? 100 : 0;
        const totalScore = Math.floor(finalScore + bonusScore);
        
        // Check if game was completed successfully
        const minWordsFound = Math.ceil(words.length * 0.7); // 70% of words found
        const isSuccessful = foundWords.length >= minWordsFound;
        
        // Track level progress
        trackLevelProgress(isSuccessful);
        
        // Sauvegarder le score
        saveScore(totalScore);
        
        // Afficher l'écran de fin
        activeGameScreen.classList.remove('active');
        if (postGameScreen) {
            postGameScreen.classList.add('active');
            
            // Mettre à jour l'affichage des statistiques
            if (finalScoreDisplay) finalScoreDisplay.textContent = totalScore;
            if (finalWordsFoundDisplay) finalWordsFoundDisplay.textContent = foundWords.length;
            if (finalTotalWordsDisplay) finalTotalWordsDisplay.textContent = words.length;
            
            // Calculer la précision (mots trouvés / tentatives)
            const accuracy = attempts > 0 ? Math.round((foundWords.length / attempts) * 100) : 0;
            if (accuracyDisplay) accuracyDisplay.textContent = `${accuracy}%`;
            
            // Calculer le temps moyen par mot
            const avgTime = foundWords.length > 0 ? Math.round(gameTime / foundWords.length) : 0;
            if (avgTimeDisplay) avgTimeDisplay.textContent = `${avgTime}s`;
            
            // Afficher un message si c'est un nouveau record
            if (totalScore > highScore && highScoreMessage) {
                highScoreMessage.style.display = 'block';
            }
        } else {
            alert(`Jeu terminé ! Votre score est de ${totalScore}`);
            resetGame();
        }
    }
    
    // Réinitialiser le jeu pour rejouer
    function resetGame() {
        // Réinitialiser les variables
        selectedCells = [];
        foundWords = [];
        score = 0;
        timer = 600;
        
        clearInterval(gameTimer);
        
        // Clean up letter animations
        cleanupLetterAnimations();
        
        // Reinitialize letter explosion background
        initializeLetterExplosionBackground();
        
        // Réinitialiser l'interface
        if (postGameScreen) postGameScreen.classList.remove('active');
        preGameScreen.classList.add('active');
        activeGameScreen.classList.remove('active');
        
        // Vider la grille
        wordSearchGrid.innerHTML = '';
    }
    
    // Fonction pour suivre la progression de niveau
    function trackLevelProgress(isSuccessful) {
        fetch(`/level-progress/track?package=${packageId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                game_type: 'word_search',
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
    
    // Sauvegarder le score sur le serveur
    async function saveScore(score) {
        try {
            const response = await fetch('/games/wordSearch/saveScore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ score })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la sauvegarde du score');
            }
            
            // Mettre à jour le high score local
            if (data.isHighScore) {
                highScore = score;
            }
            
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du score:', error);
        }
    }
    
    // Initialiser le jeu
    init();
    
    // Événements pour rejouer
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', resetGame);
    }
});