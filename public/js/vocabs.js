document.addEventListener('DOMContentLoaded', function() {

    // Add pulsing effect to the learn button
    

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

function handleDeleteClick(e) {
    e.preventDefault();
    const wordId = this.getAttribute('data-id');
    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    // Add visual feedback
    const row = this.closest('tr');
    
    fetch(`/monVocabs/delete/${wordId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
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
    const wordId = this.getAttribute('data-id');
    const row = this.closest('tr');
    
    if (!row.dataset.editing) {
        // Sauvegarder les valeurs originales pour pouvoir annuler
        const originalValues = [];
        for (let i = 0; i < 8; i++) {
            originalValues.push(row.cells[i].textContent.trim());
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
        cellContents.push(`<input type="text" class="edit-input" value="${row.cells[0].textContent.trim()}" required>`);
        
        // Type (cell 1)
        const typeText = row.cells[1].textContent.trim();
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
        
        // Meaning (cell 2)
        cellContents.push(`<input type="text" class="edit-input" value="${row.cells[2].textContent.trim()}" required>`);
        
        // Pronunciation (cell 3)
        cellContents.push(`<input type="text" class="edit-input" value="${row.cells[3].textContent.trim()}">`);
        
        // Synonyms (cell 4)
        cellContents.push(`<input type="text" class="edit-input" value="${row.cells[4].textContent.trim()}">`);
        
        // Antonyms (cell 5)
        cellContents.push(`<input type="text" class="edit-input" value="${row.cells[5].textContent.trim()}">`);
        
        // Example (cell 6)
        cellContents.push(`<input type="text" class="edit-input" value="${row.cells[6].textContent.trim()}" required>`);
        
        // Grammar (cell 7)
        cellContents.push(`<input type="text" class="edit-input" value="${row.cells[7].textContent.trim()}">`);
        
        // Appliquer les inputs aux cellules
        for (let i = 0; i < cellContents.length; i++) {
            row.cells[i].innerHTML = cellContents[i];
        }
        
        // Remplacer les boutons d'action
        row.cells[8].innerHTML = `
            <div class="action-buttons">
                <button type="button" class="save-btn" title="Valider" data-id="${wordId}">
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
        row.querySelector('.save-btn').addEventListener('click', saveWord);
        
        // Ajouter l'event listener pour le bouton d'annulation
        row.querySelector('.cancel-btn').addEventListener('click', cancelEdit);
    }
}

function cancelEdit() {
    const row = this.closest('tr');
    
    // Restaurer les valeurs originales
    if (row.dataset.originalValues) {
        const originalValues = JSON.parse(row.dataset.originalValues);
        
        // Restaurer les cellules
        for (let i = 0; i < originalValues.length; i++) {
            row.cells[i].textContent = originalValues[i];
        }
        
        // Récupérer l'ID du mot
        const wordId = row.querySelector('.save-btn')?.getAttribute('data-id') || 
                      this.closest('.action-buttons')?.querySelector('.save-btn')?.getAttribute('data-id');
        
        // Restaurer les boutons d'action
        row.cells[8].innerHTML = `
            <div class="action-buttons">
                <form action="/monVocabs/edit/${wordId}" method="POST" class="edit-form" onsubmit="return false;">
                    <button type="submit" class="edit-btn" title="Modifier" data-id="${wordId}">
                        <i class="fas fa-edit"></i>
                    </button>
                </form>

                <form action="/monVocabs/delete/${wordId}" method="POST" class="delete-form" onsubmit="return false;">
                    <button type="submit" class="delete-btn" title="Supprimer" data-id="${wordId}">
                        <i class="fas fa-trash"></i>
                    </button>
                </form>
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

function saveWord() {
    const row = this.closest('tr');
    const wordId = this.getAttribute('data-id');
    
    // Collecter les données du formulaire
    const word = row.cells[0].querySelector('input').value.trim();
    const type = row.cells[1].querySelector('select').value;
    const meaning = row.cells[2].querySelector('input').value.trim();
    const pronunciation = row.cells[3].querySelector('input').value.trim();
    const synonyms = row.cells[4].querySelector('input').value.trim();
    const antonyms = row.cells[5].querySelector('input').value.trim();
    const example = row.cells[6].querySelector('input').value.trim();
    const grammar = row.cells[7].querySelector('input').value.trim();
    const level = row.querySelector('.level-select').value;
    
    // Valider les champs obligatoires
    if (!word || !type || !meaning || !example) {
        showNotification('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }
    
    // Préparation des données pour l'envoi
    const wordData = {
        word,
        type,
        meaning,
        pronunciation,
        synonyms,
        antonyms,
        example,
        grammar,
        level,
        subject: 'General' // Valeur par défaut pour le sujet, à adapter si nécessaire
    };
    
    // Afficher un indicateur de chargement
    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    this.disabled = true;
    
    // Envoyer les données au serveur
    fetch(`/monVocabs/edit/${wordId}`, {
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
            
            // Mettre à jour les cellules
            row.cells[0].textContent = word;
            row.cells[1].textContent = type;
            row.cells[2].textContent = meaning;
            row.cells[3].textContent = pronunciation;
            row.cells[4].textContent = synonyms;
            row.cells[5].textContent = antonyms;
            row.cells[6].textContent = example;
            row.cells[7].textContent = grammar;
            
            // Restaurer les boutons d'action
            row.cells[8].innerHTML = `
                <div class="action-buttons">
                    <form action="/monVocabs/edit/${wordId}" method="POST" class="edit-form" onsubmit="return false;">
                        <button type="submit" class="edit-btn" title="Modifier" data-id="${wordId}">
                            <i class="fas fa-edit"></i>
                        </button>
                    </form>

                    <form action="/monVocabs/delete/${wordId}" method="POST" class="delete-form" onsubmit="return false;">
                        <button type="submit" class="delete-btn" title="Supprimer" data-id="${wordId}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </form>
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
