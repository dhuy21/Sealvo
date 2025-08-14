 //Package id
const packageId = document.querySelector('.vocabulary-container')?.getAttribute('data-package');

// Détection du type d'appareil mobile
let isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

 // Screen rotation notification state
 let rotationNotification = null;
 let isLandscapeMode = false;


if (!packageId) {
    console.error('Package ID not found. Check if data-package attribute exists on .vocabulary-container');
}
document.addEventListener('DOMContentLoaded', function() {
    // Initialize search functionality
    initSearch();

   // Check initial screen orientation
   checkScreenOrientation();
        
   // Add orientation change event listeners
   window.addEventListener('resize', handleOrientationChange);
   window.addEventListener('orientationchange', handleOrientationChange);
   
   // Add iOS Safari specific orientation detection
   if (isTouchDevice) {
       // Check orientation on touch events
       document.addEventListener('touchstart', () => {
           setTimeout(checkScreenOrientation, 100);
       }, { passive: true });
   }

   // Window resize listener
   window.addEventListener('resize', checkScreenSize);
        
   // Initial screen size check
   checkScreenSize();

    // 3D button hover effect enhancement
    const buttons = document.querySelectorAll('.add-word-btn, .learn-btn, .btn-danger, .home-cta .btn, .no-words .btn');
    buttons.forEach(button => {
        // Add subtle mouse movement effect on hover
        button.addEventListener('mousemove', function(e) {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left; 
            const y = e.clientY - rect.top;
            
            // Calculate rotations (very slight)
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Limit the rotation to a tiny angle (0.5 degrees max)
            const rotateY = ((x - centerX) / centerX) * 0.5; 
            const rotateX = -((y - centerY) / centerY) * 0.5;
            
            // Apply subtle rotation
            button.style.transform = `translate(0, 0.25em) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        
        // Reset on mouse leave
        button.addEventListener('mouseleave', function() {
            button.style.transform = '';
        });
    });

    // Apply data attributes to level containers for styling
    document.querySelectorAll('.level-container').forEach(container => {
        const levelText = container.querySelector('.level-header span').textContent;
        const level = levelText.replace('Niveau ', '').trim();
        container.setAttribute('data-level', level);
    });

    // Attach event listeners to edit and delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', handleDeleteClick);
        
    });

    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', handleEditClick);
        
    });
    
    // Ajouter des styles pour les inputs d'édition et animations
    const style = document.createElement('style');
    style.textContent = `
        .edit-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.2s ease;
        }
        
        .edit-input:focus {
            border-color: #2575fc;
            outline: none;
            box-shadow: 0 0 0 3px rgba(37, 117, 252, 0.15);
        }
        
        .save-btn, .cancel-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 6px;
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        
        .save-btn {
            color: #28a745;
        }
        
        .cancel-btn {
            color: #dc3545;
        }
        
        .save-btn:hover {
            background-color: rgba(40, 167, 69, 0.1);
            transform: translateY(-2px);
        }
        
        .cancel-btn:hover {
            background-color: rgba(220, 53, 69, 0.1);
            transform: translateY(-2px);
        }
        
        .alert {
            padding: 16px 24px;
            border-radius: 12px;
            margin-bottom: 25px;
            animation: fadeIn 0.4s ease;
        }
        
        .alert-success {
            background-color: #d4edda;
            border-left: 4px solid #28a745;
            color: #155724;
        }
        
        .alert-error {
            background-color: #f8d7da;
            border-left: 4px solid #dc3545;
            color: #721c24;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulseEffect {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .pulse-animation {
            animation: pulseEffect 2s infinite;
        }
        
        .row-highlight {
            background-color: rgba(37, 117, 252, 0.05);
            transition: background-color 0.5s ease;
        }
        
        .row-deleted {
            animation: rowDeletedAnimation 0.8s ease forwards;
        }
        
        @keyframes rowDeletedAnimation {
            0% { opacity: 1; transform: translateX(0); }
            20% { opacity: 1; transform: translateX(-10px); }
            100% { opacity: 0; transform: translateX(30px); height: 0; margin: 0; padding: 0; }
        }
    `;
    document.head.appendChild(style);
});

// Screen Rotation Notification Functions
function checkScreenOrientation() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Check if screen width is <= 950px (mobile/tablet portrait)
    if (screenWidth <= 1280) {
        // Check if device is in landscape mode
        isLandscapeMode = screenWidth > screenHeight;
        console.log('isLandscapeMode', isLandscapeMode);
        if (!isLandscapeMode) {
            // Show rotation notification
            showRotationNotification();
            console.log('showRotationNotification');
            return false;
        } else {
            // Hide rotation notification if it exists
            hideRotationNotification();
            console.log('hideRotationNotification');
            return true;
        }
    } else {
        // Large screen, no rotation needed
        hideRotationNotification();
        isLandscapeMode = true;
        return true;
    }
}

function showRotationNotification() {
    // Don't show multiple notifications
    if (rotationNotification) return;
    
    // Create rotation notification
    rotationNotification = document.createElement('div');
    rotationNotification.className = 'rotation-notification';
    rotationNotification.innerHTML = `
        <div class="rotation-icon">📱</div>
        <div class="rotation-content">
            <div class="rotation-title">Tourner l'écran</div>
            <div class="rotation-message">Il faudrait tourner votre appareil en mode paysage</div>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(rotationNotification);
    
    // Force reflow for iOS Safari
    rotationNotification.offsetHeight;
    
    // Show notification with animation
    setTimeout(() => {
        rotationNotification.classList.add('show');
    }, 100);
    
}

function hideRotationNotification() {
    if (rotationNotification) {
        rotationNotification.classList.remove('show');
        
        setTimeout(() => {
            if (rotationNotification && rotationNotification.parentNode) {
                rotationNotification.parentNode.removeChild(rotationNotification);
                rotationNotification = null;
            }
        }, 300);
    }
}

function checkScreenSize() {
    const isSmallScreen = window.innerWidth <= 1300;
    
    // Also check orientation when screen size changes
    checkScreenOrientation();
}

function handleOrientationChange() {
    // Debounce the orientation check
    clearTimeout(window.orientationChangeTimeout);
    window.orientationChangeTimeout = setTimeout(() => {
        checkScreenOrientation();
    }, 100);
}

function handleDeleteClick(e) {
    e.preventDefault();
    const detailId = this.getAttribute('data-id');
    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    // Add visual feedback
    const row = this.closest('tr');
    
    console.log('Deleting word with ID:', detailId, 'Package ID:', packageId);
    fetch(`/monVocabs/delete/${detailId}?package=${packageId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }
        if (data.success) {
            // Supprimer la ligne du tableau avec animation améliorée
            if (row) {
                // Trouver le niveau du mot
                const levelContainer = row.closest('.level-container');
                
                // Animer la suppression avec un effet de glissement
                row.classList.add('row-deleted');
                
                setTimeout(() => {
                    row.remove();
                    
                    // Mettre à jour le compteur de mots pour ce niveau
                    if (levelContainer) {
                        const badge = levelContainer.querySelector('.level-badge');
                        const tbody = levelContainer.querySelector('tbody');
                        const count = tbody.querySelectorAll('tr').length;
                        
                        // Animer le changement de nombre
                        badge.style.transform = 'scale(1.2)';
                        badge.style.transition = 'transform 0.3s ease';
                        
                        setTimeout(() => {
                            badge.textContent = `${count} mot(s)`;
                            badge.style.transform = 'scale(1)';
                        }, 300);
                        
                        // Si plus de mots dans ce niveau, masquer le conteneur avec animation
                        if (count === 0) {
                            levelContainer.style.transition = 'all 0.5s ease';
                            levelContainer.style.opacity = '0';
                            levelContainer.style.transform = 'translateY(-20px)';
                            
                            setTimeout(() => {
                                levelContainer.style.display = 'none';
                            }, 500);
                        }
                        
                        // Vérifier s'il reste des niveaux visibles
                        const visibleLevels = Array.from(document.querySelectorAll('.level-container')).filter(
                            container => container.style.display !== 'none'
                        );
                        
                        // S'il n'y a plus de mots, afficher le message "aucun mot"
                        if (visibleLevels.length === 0) {
                            const noWordsDiv = document.createElement('div');
                            noWordsDiv.className = 'no-words';
                            noWordsDiv.innerHTML = `
                                <i class="fas fa-book"></i>
                                <h3>Aucun mot dans votre vocabulaire</h3>
                                <p>Commencez à ajouter des mots pour enrichir votre vocabulaire.</p>
                                <a href="/monVocabs/add" class="btn">Ajouter votre premier mot</a>
                            `;
                            
                            noWordsDiv.style.opacity = '0';
                            noWordsDiv.style.transform = 'translateY(20px)';
                            noWordsDiv.style.transition = 'all 0.5s ease';
                            
                            const container = document.querySelector('.vocabulary-container');
                            const homeCta = container.querySelector('.home-cta');
                            if (homeCta) {
                                container.insertBefore(noWordsDiv, homeCta);
                            } else {
                                container.appendChild(noWordsDiv);
                            }
                            
                            // Animation d'entrée
                            setTimeout(() => {
                                noWordsDiv.style.opacity = '1';
                                noWordsDiv.style.transform = 'translateY(0)';
                            }, 50);
                        }
                    }
                }, 800);
            }

            // Afficher un message de succès en haut de la page
            showNotification(data.message, 'success');
        } else {
            // Restaurer le bouton de suppression
            this.innerHTML = '<i class="fas fa-trash"></i>';
            showNotification(data.message || 'Erreur lors de la suppression du mot', 'error');
        }
    })
    .catch(error => {
        console.log('Error:', error);
        // Restaurer le bouton de suppression
        this.innerHTML = '<i class="fas fa-trash"></i>';
        showNotification('Une erreur est survenue lors de la suppression du mot', 'error');
    });
}

function handleEditClick(e) {
    e.preventDefault();
    const detailId = this.getAttribute('data-id');
    const row = this.closest('tr');
    
    if (!row.dataset.editing) {
        // Sauvegarder les valeurs originales pour pouvoir annuler
        const originalValues = [];
        for (let i = 0; i < 9; i++) {
            const cellContent = row.cells[i].querySelector('.table-cell-content');
            originalValues.push(cellContent ? cellContent.textContent.trim() : row.cells[i].textContent.trim());
        }
        row.dataset.originalValues = JSON.stringify(originalValues);
        
        // Extraire le niveau du mot depuis son conteneur parent
        const levelContainer = row.closest('.level-container');
        const levelText = levelContainer ? levelContainer.querySelector('.level-header span').textContent : '';
        const level = levelText.replace('Niveau ', '').trim();
        row.dataset.level = level;
        
        // Transformer les cellules en inputs
        let cellContents = [];
        
        // Mot (cell 0)
        const wordText = row.cells[0].querySelector('.table-cell-content')?.textContent.trim() || row.cells[0].textContent.trim();
        cellContents.push(`<input type="text" class="edit-input" value="${wordText}" required>`);
        
        //language_code (cell 1)
        const langText = row.cells[1].querySelector('.table-cell-content')?.textContent.trim() || row.cells[1].textContent.trim();
        cellContents.push(`<input type="text" class="edit-input" value="${langText}" required>`);
        
        // Type (cell 2)
        const typeText = row.cells[2].querySelector('.table-cell-content')?.textContent.trim() || row.cells[2].textContent.trim();
        cellContents.push(`
            <select class="edit-input" required>
                <option value="noun" ${typeText === 'noun' ? 'selected' : ''}>Nom</option>
                <option value="verb" ${typeText === 'verb' ? 'selected' : ''}>Verbe</option>
                <option value="adjective" ${typeText === 'adjective' ? 'selected' : ''}>Adjectif</option>
                <option value="adverb" ${typeText === 'adverb' ? 'selected' : ''}>Adverbe</option>
                <option value="ph.v" ${typeText === 'ph.v' ? 'selected' : ''}>Ph.V</option>
                <option value="idiom" ${typeText === 'idiom' ? 'selected' : ''}>Idiom</option>
                <option value="collocation" ${typeText === 'collocation' ? 'selected' : ''}>Colloc</option>
            </select>
        `);
        
        // Meaning (cell 3)
        const meaningText = row.cells[3].querySelector('.table-cell-content')?.textContent.trim() || row.cells[3].textContent.trim();
        cellContents.push(`<input type="text" class="edit-input" value="${meaningText}" required>`);
        
        // Pronunciation (cell 4)
        const pronText = row.cells[4].querySelector('.table-cell-content')?.textContent.trim() || row.cells[4].textContent.trim();
        cellContents.push(`<input type="text" class="edit-input" value="${pronText}">`);
        
        // Synonyms (cell 5)
        const synText = row.cells[5].querySelector('.table-cell-content')?.textContent.trim() || row.cells[5].textContent.trim();
        cellContents.push(`<input type="text" class="edit-input" value="${synText}">`);
        
        // Antonyms (cell 6)
        const antText = row.cells[6].querySelector('.table-cell-content')?.textContent.trim() || row.cells[6].textContent.trim();
        cellContents.push(`<input type="text" class="edit-input" value="${antText}">`);
        
        // Example (cell 7)
        const exText = row.cells[7].querySelector('.table-cell-content')?.textContent.trim() || row.cells[7].textContent.trim();
        cellContents.push(`<input type="text" class="edit-input" value="${exText}" required>`);
        
        // Grammar (cell 8)
        const gramText = row.cells[8].querySelector('.table-cell-content')?.textContent.trim() || row.cells[8].textContent.trim();
        cellContents.push(`<input type="text" class="edit-input" value="${gramText}">`);
        
        // Appliquer les inputs aux cellules en préservant la structure
        for (let i = 0; i < cellContents.length; i++) {
            // Vérifier si la cellule a déjà un div table-cell-content
            const existingDiv = row.cells[i].querySelector('.table-cell-content');
            if (existingDiv) {
                // Remplacer le contenu du div existant
                existingDiv.innerHTML = cellContents[i];
            } else {
                // Créer un nouveau div si nécessaire
                row.cells[i].innerHTML = `<div class="table-cell-content">${cellContents[i]}</div>`;
            }
        }
        
        // Remplacer les boutons d'action
        row.cells[9].innerHTML = `
            <div class="action-buttons">
                <button type="button" class="save-btn" title="Valider" data-id="${detailId}">
                    <i class="fas fa-check"></i>
                </button>
            
                <button type="button" class="cancel-btn" title="Annuler">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Ajouter le champ de niveau caché
        row.querySelector('.action-buttons').insertAdjacentHTML('beforeend', `
            <div style="display:none;">
                <select class="level-select">
                    <option value="x" ${level === 'x' ? 'selected' : ''}>Niveau x</option>
                    <option value="0" ${level === '0' ? 'selected' : ''}>Niveau 0</option>
                    <option value="1" ${level === '1' ? 'selected' : ''}>Niveau 1</option>
                    <option value="2" ${level === '2' ? 'selected' : ''}>Niveau 2</option>
                    <option value="v" ${level === 'v' ? 'selected' : ''}>Niveau v</option>
                </select>
            </div>
        `);
        
        // Marquer la ligne comme étant en cours d'édition
        row.dataset.editing = "true";
        
        // Ajouter l'event listener pour le bouton de sauvegarde
        row.querySelector('.save-btn').addEventListener('click', saveWordPost);
        
        // Ajouter l'event listener pour le bouton d'annulation
        row.querySelector('.cancel-btn').addEventListener('click', cancelEdit);
    }
}

function cancelEdit() {
    const row = this.closest('tr');
    
    // Restaurer les valeurs originales
    if (row.dataset.originalValues) {
        const originalValues = JSON.parse(row.dataset.originalValues);
        
        // Restaurer les cellules avec la structure table-cell-content
        for (let i = 0; i < originalValues.length; i++) {
            // Vérifier si la cellule a déjà un div table-cell-content
            let cellContent = row.cells[i].querySelector('.table-cell-content');
            if (!cellContent) {
                // Créer le div s'il n'existe pas
                row.cells[i].innerHTML = `<div class="table-cell-content">${originalValues[i]}</div>`;
            } else {
                // Restaurer le contenu dans le div existant
                cellContent.textContent = originalValues[i];
            }
        }
        
        // Récupérer l'ID du mot
        const detailId = row.querySelector('.save-btn')?.getAttribute('data-id') || 
                        this.closest('.action-buttons')?.querySelector('.save-btn')?.getAttribute('data-id');
        
        // Restaurer les boutons d'action
        row.cells[9].innerHTML = `
            <div class="action-buttons">
                <button class="edit-btn" title="Modifier" data-id="${detailId}">
                    <i class="fas fa-edit"></i>
                </button>

                <button class="delete-btn" title="Supprimer" data-id="${detailId}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Réattacher les événements aux nouveaux boutons
        row.querySelector('.edit-btn')?.addEventListener('click', handleEditClick);
        row.querySelector('.delete-btn')?.addEventListener('click', handleDeleteClick);
    }
    
    // Supprimer le marqueur d'édition
    delete row.dataset.editing;
    delete row.dataset.originalValues;
}

function saveWordPost() {
    const row = this.closest('tr');
    const detailId = this.getAttribute('data-id');
    
    // Collecter les données du formulaire
    const word = row.cells[0].querySelector('input').value.trim();
    const language_code = row.cells[1].querySelector('input').value.trim();
    const type = row.cells[2].querySelector('select').value;
    const meaning = row.cells[3].querySelector('input').value.trim();
    const pronunciation = row.cells[4].querySelector('input').value.trim();
    const synonyms = row.cells[5].querySelector('input').value.trim();
    const antonyms = row.cells[6].querySelector('input').value.trim();
    const example = row.cells[7].querySelector('input').value.trim();
    const grammar = row.cells[8].querySelector('input').value.trim();
    const level = row.querySelector('.level-select').value;
    
    // Valider les champs obligatoires
    if (!word || !language_code || !type || !meaning || !example) {
        showNotification('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }
    
    
    // Préparation des données pour l'envoi
    const wordData = {
        word,
        language_code,
        type,
        meaning,
        pronunciation,
        synonyms,
        antonyms,
        example,
        grammar,
        level
    };
    
    // Afficher un indicateur de chargement
    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    this.disabled = true;
    
    // Envoyer les données au serveur
    fetch(`/monVocabs/edit/${detailId}?package=${packageId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(wordData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Si le niveau a changé, recharger la page
            if (level !== row.dataset.level) {
                window.location.reload();
                return;
            }
            
            // Mettre à jour les cellules avec la structure table-cell-content
            const updateCell = (index, value) => {
                // Vérifier si la cellule a déjà un div table-cell-content
                let cellContent = row.cells[index].querySelector('.table-cell-content');
                if (!cellContent) {
                    // Créer le div s'il n'existe pas
                    row.cells[index].innerHTML = `<div class="table-cell-content">${value}</div>`;
                } else {
                    // Mettre à jour le contenu dans le div existant
                    cellContent.textContent = value;
                }
            };
            
            updateCell(0, word);
            updateCell(1, language_code);
            updateCell(2, type);
            updateCell(3, meaning);
            updateCell(4, pronunciation);
            updateCell(5, synonyms);
            updateCell(6, antonyms);
            updateCell(7, example);
            updateCell(8, grammar);
            
            // Restaurer les boutons d'action
            row.cells[9].innerHTML = `
                <div class="action-buttons">
                        <button  class="edit-btn" title="Modifier" data-id="${detailId}">
                            <i class="fas fa-edit"></i>
                        </button>

                        <button  class="delete-btn" title="Supprimer" data-id="${detailId}">
                            <i class="fas fa-trash"></i>
                        </button>
                </div>
            `;
            
            // Réattacher les événements aux nouveaux boutons
            row.querySelector('.edit-btn')?.addEventListener('click', handleEditClick);
            row.querySelector('.delete-btn')?.addEventListener('click', handleDeleteClick);
            
            // Supprimer le marqueur d'édition
            delete row.dataset.editing;
            delete row.dataset.originalValues;
            
            // Afficher le message de succès
            showNotification(data.message || 'Mot modifié avec succès', 'success');
        } else {
            // Réactiver le bouton en cas d'erreur
            this.innerHTML = '<i class="fas fa-check"></i>';
            this.disabled = false;
            
            showNotification(data.message || 'Erreur lors de la modification du mot', 'error');
        }
    })
    .catch(error => {
        console.log('Error:', error);
        
        // Réactiver le bouton en cas d'erreur
        this.innerHTML = '<i class="fas fa-check"></i>';
        this.disabled = false;
        
        showNotification('Une erreur est survenue lors de la modification du mot', 'error');
    });
}

function showNotification(message, type) {
    // Supprimer les notifications existantes
    const existingNotifications = document.querySelectorAll('.alert');
    existingNotifications.forEach(notif => notif.remove());
    
    // Créer la nouvelle notification
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;
    
    // Ajouter la notification au début du conteneur
    const container = document.querySelector('.vocabulary-container');
    const title = container.querySelector('h1');
    
    if (title) {
        container.insertBefore(notification, title.nextSibling);
    } else {
        container.insertBefore(notification, container.firstChild);
    }
    
    // Animation d'entrée
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
        notification.style.transition = 'all 0.4s ease';
    }, 10);
    
    // Faire disparaître après 3 secondes
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px)';
        
        // Supprimer complètement après la transition
        setTimeout(() => {
            notification.remove();
        }, 400);
    }, 3000);
}

// Client-side search functionality
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const searchResultsInfo = document.getElementById('search-results-info');
    const searchTermDisplay = document.getElementById('search-term-display');
    const searchCountDisplay = document.getElementById('search-count');
    
    if (!searchInput || !searchBtn || !clearSearchBtn) return;

    // Function to perform the search
    function performSearch() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        
        if (searchTerm === '') {
            // If search is empty, show all words
            clearSearch();
            return;
        }
        
        // Add searching effect
        document.querySelector('.input-group').classList.add('searching');
        setTimeout(() => {
            document.querySelector('.input-group').classList.remove('searching');
        }, 600);
        
        // Show the clear button and search info
        clearSearchBtn.style.display = 'flex';
        clearSearchBtn.style.opacity = '0';
        clearSearchBtn.style.transform = 'translateY(-50%) scale(0.8)';
        setTimeout(() => {
            clearSearchBtn.style.opacity = '1';
            clearSearchBtn.style.transform = 'translateY(-50%) scale(1)';
        }, 100);
        
        // Show and animate search results info
        searchResultsInfo.style.display = 'block';
        searchResultsInfo.style.opacity = '0';
        searchResultsInfo.style.transform = 'translateY(20px)';
        searchTermDisplay.textContent = searchTerm;
        setTimeout(() => {
            searchResultsInfo.style.opacity = '1';
            searchResultsInfo.style.transform = 'translateY(0)';
        }, 150);
        
        // Get all level containers
        const levelContainers = document.querySelectorAll('.level-container');
        let totalVisibleRows = 0;
        
        levelContainers.forEach(container => {
            const rows = container.querySelectorAll('tbody tr');
            let visibleRowsInLevel = 0;
            
            rows.forEach((row, index) => {
                // Get text from all cells (except actions column)
                const cells = row.querySelectorAll('td:not(:last-child)');
                let rowText = '';
                cells.forEach(cell => {
                    const cellContent = cell.querySelector('.table-cell-content');
                    const text = cellContent ? cellContent.textContent : cell.textContent;
                    rowText += text.toLowerCase() + ' ';
                });
                
                // Check if the search term is in any cell text
                if (rowText.includes(searchTerm)) {
                    // Apply staggered animation for visible rows
                    if (row.style.display === 'none') {
                        row.style.opacity = '0';
                        row.style.transform = 'translateY(20px) scale(0.97)';
                        row.style.transition = 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
                        row.style.display = 'table-row';
                        
                        // Staggered animation delay based on row index
                        setTimeout(() => {
                            row.style.opacity = '1';
                            row.style.transform = 'translateY(0) scale(1)';
                        }, 200 + (index * 30)); // Staggered delay
                    }
                    
                    visibleRowsInLevel++;
                    totalVisibleRows++;
                    
                    // Highlight matching content
                    highlightMatches(row, searchTerm);
                } else {
                    // Animate hiding rows
                    if (row.style.display !== 'none') {
                        row.style.opacity = '1';
                        row.style.transform = 'translateY(0) scale(1)';
                        
                        // Animate out
                        row.style.opacity = '0';
                        row.style.transform = 'translateY(20px) scale(0.95)';
                        
                        // Hide after animation completes
                        setTimeout(() => {
                            row.style.display = 'none';
                        }, 300);
                    }
                }
            });
            
            // Show/hide level container based on whether it has any visible rows
            if (visibleRowsInLevel > 0) {
                // If previously hidden, animate in
                if (container.style.display === 'none') {
                    container.style.opacity = '0';
                    container.style.transform = 'translateY(30px) scale(0.98)';
                    container.style.display = 'block';
                    
                    // Trigger animation
                    setTimeout(() => {
                        container.style.opacity = '1';
                        container.style.transform = 'translateY(0) scale(1)';
                        container.style.transition = 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
                    }, 100);
                }
                
                // Update the level badge with filtered count
                const badge = container.querySelector('.level-badge');
                if (badge) {
                    // Animate the badge update
                    badge.style.transform = 'scale(1.3)';
                    badge.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    
                    setTimeout(() => {
                        badge.textContent = `${visibleRowsInLevel} mot(s)`;
                        badge.style.transform = 'scale(1)';
                    }, 300);
                }
            } else {
                // If it has words but none match, animate out
                if (container.style.display !== 'none') {
                    container.style.opacity = '1';
                    container.style.transform = 'translateY(0) scale(1)';
                    container.style.transition = 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
                    
                    // Animate out
                    container.style.opacity = '0';
                    container.style.transform = 'translateY(30px) scale(0.95)';
                    
                    // Hide after animation completes
                    setTimeout(() => {
                        container.style.display = 'none';
                    }, 500);
                }
            }
        });
        
        // Update search count with animation
        const currentCount = parseInt(searchCountDisplay.textContent);
        // Animate count up
        animateCounterUp(currentCount, totalVisibleRows, searchCountDisplay);
        
        // Show no results message if needed
        toggleNoResultsMessage(totalVisibleRows === 0);
    }
    
    // Function to animate counter
    function animateCounterUp(start, end, element) {
        let current = start;
        const duration = 500; // ms
        const frameRate = 1000 / 60; // 60fps
        const totalFrames = Math.round(duration / frameRate);
        const increment = (end - start) / totalFrames;
        
        const animate = () => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                element.textContent = end;
            } else {
                element.textContent = Math.round(current);
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    // Function to clear the search
    function clearSearch() {
        // Clear input with animation
        searchInput.value = '';
        
        // Hide clear button and search info with animation
        if (clearSearchBtn.style.display !== 'none') {
            clearSearchBtn.style.opacity = '0';
            clearSearchBtn.style.transform = 'translateY(-50%) scale(0.9)';
            setTimeout(() => {
                clearSearchBtn.style.display = 'none';
            }, 300);
        }
        
        if (searchResultsInfo.style.display !== 'none') {
            searchResultsInfo.style.opacity = '0';
            searchResultsInfo.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                searchResultsInfo.style.display = 'none';
                searchResultsInfo.style.transform = '';
            }, 300);
        }
        
        // Show all level containers with animation
        const levelContainers = document.querySelectorAll('.level-container');
        levelContainers.forEach((container, index) => {
            // If it was hidden, animate it back in
            if (container.style.display === 'none') {
                container.style.opacity = '0';
                container.style.transform = 'translateY(15px)';
                container.style.display = 'block';
                container.style.transition = 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
                
                // Staggered animation
                setTimeout(() => {
                    container.style.opacity = '1';
                    container.style.transform = 'translateY(0)';
                }, 100 + (index * 50));
            }
            
            // Reset the level badge count with animation
            const badge = container.querySelector('.level-badge');
            const rows = container.querySelectorAll('tbody tr');
            if (badge) {
                badge.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    badge.textContent = `${rows.length} mot(s)`;
                    badge.style.transform = 'scale(1)';
                }, 200);
            }
            
            // Show all rows with staggered animation
            rows.forEach((row, rowIndex) => {
                if (row.style.display === 'none') {
                    row.style.opacity = '0';
                    row.style.transform = 'translateY(10px)';
                    row.style.transition = 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
                    row.style.display = 'table-row';
                    
                    // Staggered animation delay based on row index
                    setTimeout(() => {
                        row.style.opacity = '1';
                        row.style.transform = 'translateY(0)';
                    }, 100 + (rowIndex * 20)); // Staggered delay
                }
                
                // Remove any highlights with fade-out effect
                const highlights = row.querySelectorAll('.search-highlight');
                highlights.forEach(highlight => {
                    const text = highlight.textContent;
                    const span = document.createElement('span');
                    span.textContent = text;
                    span.style.transition = 'all 0.3s ease';
                    highlight.parentNode.replaceChild(span, highlight);
                });
            });
        });
        
        // Hide no results message with animation
        const noResultsMsg = document.getElementById('no-search-results');
        if (noResultsMsg && noResultsMsg.style.display !== 'none') {
            noResultsMsg.style.opacity = '0';
            noResultsMsg.style.transform = 'translateY(10px)';
            setTimeout(() => {
                noResultsMsg.style.display = 'none';
            }, 300);
        }
    }
    
    // Function to highlight matching text
    function highlightMatches(row, searchTerm) {
        const cells = row.querySelectorAll('td:not(:last-child)');
        cells.forEach(cell => {
            const cellContent = cell.querySelector('.table-cell-content');
            if (!cellContent) return;
            
            const text = cellContent.textContent;
            const lowerText = text.toLowerCase();
            const index = lowerText.indexOf(searchTerm.toLowerCase());
            
            if (index !== -1) {
                let newHtml = '';
                let i = 0;
                
                while (i < text.length) {
                    if (i === index) {
                        newHtml += '<span class="search-highlight">';
                        newHtml += text.substring(i, i + searchTerm.length);
                        newHtml += '</span>';
                        i += searchTerm.length;
                    } else {
                        newHtml += text.charAt(i);
                        i++;
                    }
                }
                
                cellContent.innerHTML = newHtml;
            }
        });
    }
    
    // Function to show/hide no results message
    function toggleNoResultsMessage(show) {
        // Check if message already exists
        let noResultsMsg = document.getElementById('no-search-results');
        
        if (show) {
            if (!noResultsMsg) {
                // Create message if it doesn't exist
                noResultsMsg = document.createElement('div');
                noResultsMsg.id = 'no-search-results';
                noResultsMsg.className = 'no-words';
                noResultsMsg.innerHTML = `
                    <i class="fas fa-search"></i>
                    <h3>Aucun résultat trouvé</h3>
                    <p>Aucun mot ne correspond à votre recherche. Essayez avec d'autres termes.</p>
                `;
                
                // Insert before home CTA
                const container = document.querySelector('.vocabulary-container');
                const homeCta = container.querySelector('.home-cta');
                if (homeCta) {
                    container.insertBefore(noResultsMsg, homeCta);
                } else {
                    container.appendChild(noResultsMsg);
                }
            } else {
                noResultsMsg.style.display = 'block';
            }
        } else if (noResultsMsg) {
            noResultsMsg.style.display = 'none';
        }
    }
    
    // Event Listeners
    searchBtn.addEventListener('click', performSearch);
    
    searchInput.addEventListener('input', function() {
        performSearch();
    });
    
    clearSearchBtn.addEventListener('click', clearSearch);
}
