/**
 * WordSearch Game
 * Jeu de recherche de mots dans une grille
 */
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si nous sommes sur la page du jeu Word Search
    // On vérifie un élément unique qui n'existe que sur cette page
    if (!document.getElementById('word-search')) {
        // Nous ne sommes pas sur la page Word Search, ne pas exécuter le script
        return;
    }
    
    // Éléments du DOM
    const gameContainer = document.getElementById('game-container');
    const preGameScreen = document.querySelector('.pre-game-screen');
    const activeGameScreen = document.querySelector('.active-game-screen');
    const postGameScreen = document.querySelector('.post-game-screen');
    const startGameBtn = document.getElementById('start-game');
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
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
    
    // Variables du jeu
    let selectedDifficulty = 'easy';
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
    
    // Initialisation
    function init() {
        // Ajouter les événements
        startGameBtn.addEventListener('click', startGame);
        playAgainBtn.addEventListener('click', resetGame);
        showHintBtn.addEventListener('click', showHint);
        
        // Gérer la sélection de difficulté
        difficultyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                difficultyBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedDifficulty = btn.dataset.difficulty;
            });
        });
    }
    
    // Démarrer le jeu
    async function startGame() {
        try {
            // Changer l'interface pour l'écran de jeu
            preGameScreen.classList.remove('active');
            activeGameScreen.classList.add('active');
            
            // Définir l'état du jeu
            gameActive = true;
            score = 0;
            foundWords = [];
            selectedCells = [];
            attempts = 0;
            startTime = Date.now();
            
            // Charger les mots depuis le serveur
            const response = await fetch(`/games/wordSearch/words?difficulty=${selectedDifficulty}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors du chargement des mots');
            }
            
            words = data.words;
            gridSize = data.gridSize;
            
            // Mettre à jour l'affichage
            scoreDisplay.textContent = score;
            wordsFoundDisplay.textContent = foundWords.length;
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
                
                wordSearchGrid.appendChild(cell);
            }
        }
        
        // Ajouter un événement pour annuler la sélection si on sort de la grille
        document.addEventListener('mouseup', endSelection);
    }
    
    // Afficher la liste des mots à trouver
    function displayWordList() {
        wordList.innerHTML = '';
        
        for (const wordObj of words) {
            const listItem = document.createElement('li');
            listItem.classList.add('word-list-item');
            listItem.dataset.id = wordObj.id;
            listItem.dataset.word = wordObj.word.toUpperCase().replace(/[^A-Z]/g, '');
            listItem.textContent = wordObj.word;
            
            wordList.appendChild(listItem);
        }
    }
    
    // Démarrer la sélection des lettres
    function startSelection(event) {
        if (!gameActive) return;
        
        // Vider les cellules sélectionnées
        clearSelectedCells();
        
        const cell = event.target;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        // Ajouter la cellule à la sélection
        selectedCells.push({ row, col, element: cell });
        cell.classList.add('selected');
    }
    
    // Gérer le survol des cellules pendant la sélection
    function handleMouseOver(event) {
        if (!gameActive || selectedCells.length === 0) return;
        
        const cell = event.target;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        // Vérifier si on est dans la même ligne, colonne ou diagonale que la cellule initiale
        const startCell = selectedCells[0];
        const dx = Math.sign(row - startCell.row);
        const dy = Math.sign(col - startCell.col);
        
        // Si on est dans la même direction, on peut sélectionner la cellule
        if (
            (dx === 0 && dy === 0) ||  // Même cellule
            (dx === 0 && dy !== 0) ||  // Même ligne
            (dy === 0 && dx !== 0) ||  // Même colonne
            (Math.abs(dx) === Math.abs(dy))  // Diagonale
        ) {
            // Vérifier si la cellule est alignée avec les cellules déjà sélectionnées
            const isAligned = selectedCells.length <= 1 || 
                (Math.sign(row - selectedCells[1].row) === dx && 
                 Math.sign(col - selectedCells[1].col) === dy);
            
            if (isAligned) {
                // Effacer les cellules sélectionnées sauf la première
                while (selectedCells.length > 1) {
                    const lastCell = selectedCells.pop();
                    lastCell.element.classList.remove('selected');
                }
                
                // Sélectionner les cellules entre la première et la cellule courante
                const currentRow = startCell.row;
                const currentCol = startCell.col;
                
                const distance = Math.max(
                    Math.abs(row - startCell.row),
                    Math.abs(col - startCell.col)
                );
                
                for (let i = 0; i <= distance; i++) {
                    const r = startCell.row + dx * i;
                    const c = startCell.col + dy * i;
                    
                    // Vérifier si la cellule est dans la grille
                    if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
                        const currentCell = document.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
                        
                        // Éviter les doublons
                        if (!selectedCells.some(cell => cell.row === r && cell.col === c)) {
                            selectedCells.push({ row: r, col: c, element: currentCell });
                            currentCell.classList.add('selected');
                        }
                    }
                }
            }
        }
    }
    
    // Terminer la sélection des lettres
    function endSelection() {
        if (!gameActive || selectedCells.length === 0) return;
        
        // Récupérer le mot sélectionné
        const selectedWord = selectedCells
            .map(cell => grid[cell.row][cell.col])
            .join('');
        
        // Vérifier si le mot est dans la liste
        const foundWordListItem = Array.from(wordList.children).find(item => {
            const word = item.dataset.word;
            return (selectedWord === word || selectedWord.split('').reverse().join('') === word);
        });
        
        if (foundWordListItem && !foundWordListItem.classList.contains('found')) {
            // Marquer le mot comme trouvé
            const wordId = foundWordListItem.dataset.id;
            const wordObj = words.find(w => w.id.toString() === wordId);
            
            foundWordListItem.classList.add('found');
            foundWords.push(wordId);
            
            // Marquer les cellules comme trouvées
            selectedCells.forEach(cell => {
                cell.element.classList.remove('selected');
                cell.element.classList.add('found');
            });
            
            // Mettre à jour le score
            const wordLength = selectedWord.length;
            const timeBonus = Math.max(0, Math.floor((timer / 10)));
            const pointsEarned = wordLength * 10 + timeBonus;
            score += pointsEarned;
            
            // Animation pour le mot trouvé
            foundWordListItem.classList.add('word-found-animation');
            setTimeout(() => {
                foundWordListItem.classList.remove('word-found-animation');
            }, 500);
            
            // Mettre à jour l'affichage
            scoreDisplay.textContent = score;
            wordsFoundDisplay.textContent = foundWords.length;
            
            // Vérifier si tous les mots ont été trouvés
            if (foundWords.length >= words.length) {
                endGame();
            }
        } else {
            // Réinitialiser la sélection
            clearSelectedCells();
            
            // Incrémenter le nombre de tentatives
            attempts++;
        }
    }
    
    // Effacer la sélection de cellules
    function clearSelectedCells() {
        selectedCells.forEach(cell => {
            cell.element.classList.remove('selected');
        });
        selectedCells = [];
    }
    
    // Afficher un indice (mettre en surbrillance temporairement la première lettre d'un mot non trouvé)
    function showHint() {
        if (!gameActive) return;
        
        // Trouver un mot qui n'a pas encore été trouvé
        const unFoundWords = words.filter(w => !foundWords.includes(w.id.toString()));
        
        if (unFoundWords.length === 0) return;
        
        // Choisir un mot aléatoire
        const randomWord = unFoundWords[Math.floor(Math.random() * unFoundWords.length)];
        const wordToFind = randomWord.word.toUpperCase().replace(/[^A-Z]/g, '');
        
        // Trouver la position de ce mot dans la grille
        let hintCell = null;
        
        // Parcourir la grille pour trouver la première lettre du mot
        outerLoop:
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (grid[i][j] === wordToFind[0]) {
                    // Vérifier si le mot est à cette position dans toutes les directions
                    for (const [dx, dy] of directions) {
                        if (canReadWord(wordToFind, i, j, dx, dy)) {
                            hintCell = document.querySelector(`.grid-cell[data-row="${i}"][data-col="${j}"]`);
                            break outerLoop;
                        }
                    }
                }
            }
        }
        
        // Mettre en surbrillance temporairement la cellule
        if (hintCell) {
            hintCell.style.backgroundColor = '#FFD700';
            setTimeout(() => {
                hintCell.style.backgroundColor = '';
            }, 1000);
            
            // Réduire légèrement le score pour utilisation d'un indice
            score = Math.max(0, score - 5);
            scoreDisplay.textContent = score;
        }
    }
    
    // Vérifier si un mot peut être lu à partir d'une position donnée
    function canReadWord(word, row, col, dx, dy) {
        if (row + dx * (word.length - 1) < 0 || row + dx * (word.length - 1) >= gridSize ||
            col + dy * (word.length - 1) < 0 || col + dy * (word.length - 1) >= gridSize) {
            return false;
        }
        
        for (let i = 0; i < word.length; i++) {
            const r = row + dx * i;
            const c = col + dy * i;
            
            if (grid[r][c] !== word[i]) {
                return false;
            }
        }
        
        return true;
    }
    
    // Terminer le jeu
    function endGame() {
        gameActive = false;
        clearInterval(gameTimer);
        
        // Afficher l'écran de fin de jeu
        activeGameScreen.classList.remove('active');
        postGameScreen.classList.add('active');
        
        // Calculer les statistiques de fin de jeu
        const totalTime = (Date.now() - startTime) / 1000;
        const avgTime = foundWords.length > 0 ? (totalTime / foundWords.length).toFixed(1) : 0;
        const accuracy = attempts > 0 ? Math.round((foundWords.length / attempts) * 100) : 0;
        
        // Mettre à jour l'affichage des statistiques
        finalScoreDisplay.textContent = score;
        finalWordsFoundDisplay.textContent = foundWords.length;
        finalTotalWordsDisplay.textContent = words.length;
        accuracyDisplay.textContent = `${accuracy}%`;
        avgTimeDisplay.textContent = `${avgTime}s`;
        
        // Vérifier si c'est un nouveau record
        if (score > highScore) {
            highScoreMessage.textContent = `Nouveau record : ${score} points !`;
            highScoreMessage.classList.add('new-record');
            
            // Enregistrer le score côté serveur
            saveScore(score);
        } else if (highScore > 0) {
            highScoreMessage.textContent = `Votre record est de ${highScore} points.`;
            highScoreMessage.classList.remove('new-record');
        } else {
            highScoreMessage.textContent = '';
        }
    }
    
    // Réinitialiser le jeu pour jouer à nouveau
    function resetGame() {
        clearInterval(gameTimer);
        
        // Réinitialiser les variables
        grid = [];
        words = [];
        foundWords = [];
        score = 0;
        timer = 600;
        selectedCells = [];
        gameActive = false;
        
        // Revenir à l'écran de pré-jeu
        preGameScreen.classList.add('active');
        activeGameScreen.classList.remove('active');
        postGameScreen.classList.remove('active');
    }
    
    // Enregistrer le score
    async function saveScore(score) {
        try {
            const response = await fetch('/games/scores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    game_type: 'word_search',
                    score: score,
                    details: {
                        wordsFound: foundWords.length,
                        totalWords: words.length,
                        difficulty: selectedDifficulty
                    }
                }),
            });
            
            if (!response.ok) {
                throw new Error('Erreur lors de l\'enregistrement du score');
            }
            
            // Mettre à jour le highScore local
            highScore = score;
            
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement du score:', error);
        }
    }
    
    // Initialiser le jeu
    init();
});