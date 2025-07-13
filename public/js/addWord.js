document.addEventListener('DOMContentLoaded', function() {
    // === VARIABLES GLOBALES ===
    const fileInput = document.getElementById('vocab-file');
    const fileNameDisplay = document.querySelector('.selected-file-name');
    const addRowButton = document.getElementById('add-row');
    const wordRows = document.getElementById('word-rows');
    const loader = document.getElementById('loader');
    const fileIcon = document.getElementById('file-icon');
    const fileText = document.getElementById('file-text');
    const importBtn = document.getElementById('import-btn');
    const importForm = document.querySelector('.import-form');
    const multiWordForm = document.querySelector('.multiple-words-form form');
    
    // === GESTION DU FICHIER D'IMPORTATION ===
    if (fileInput && fileNameDisplay) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Vérifier la taille du fichier (max 5MB)
                const maxSize = 5 * 1024 * 1024; // 5MB
                if (file.size > maxSize) {
                    showAlert('Erreur: Le fichier est trop volumineux (max 5MB)', 'error');
                    this.value = '';
                    fileNameDisplay.textContent = 'Aucun fichier sélectionné';
                    return;
                }
                
                // Vérifier le type de fichier
                const allowedTypes = [
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/vnd.ms-excel',
                    'text/csv',
                    'application/pdf'
                ];
                
                if (!allowedTypes.includes(file.type)) {
                    showAlert('Erreur: Format de fichier non supporté. Utilisez Excel, CSV ou PDF.', 'error');
                    this.value = '';
                    fileNameDisplay.textContent = 'Aucun fichier sélectionné';
                    return;
                }
                
                fileNameDisplay.textContent = file.name;
                fileNameDisplay.style.color = '#6a11cb';
                fileNameDisplay.style.fontWeight = '600';
                
                // Animation d'apparition
                fileNameDisplay.style.opacity = '0';
                fileNameDisplay.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    fileNameDisplay.style.transition = 'all 0.3s ease';
                    fileNameDisplay.style.opacity = '1';
                    fileNameDisplay.style.transform = 'translateY(0)';
                }, 100);
        } else {
          fileNameDisplay.textContent = 'Aucun fichier sélectionné';
                fileNameDisplay.style.color = '#6b7280';
                fileNameDisplay.style.fontWeight = 'normal';
        }
      });
    }
    
    // === GESTION DU FORMULAIRE D'IMPORTATION ===
    if (importForm && importBtn) {
        importForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Empêcher la soumission classique
            
            if (!fileInput.files.length) {
                showAlert('Veuillez sélectionner un fichier à importer', 'error');
                return;
            }
            
            // Afficher le loader
            showLoader();
            
            // Désactiver le bouton et changer le texte
            importBtn.disabled = true;
            importBtn.style.cursor = 'not-allowed';
            importBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importation en cours...';
            
            // Préparer les données du formulaire
            const formData = new FormData(importForm);
            
            // Envoyer la requête AJAX
            fetch(importForm.action, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                hideLoader();
                
                if (data.success) {
                    showAlert(data.message, 'success');
                    // Réinitialiser le formulaire
                    importForm.reset();
                    fileNameDisplay.textContent = 'Aucun fichier sélectionné';
                    fileNameDisplay.style.color = '#6b7280';
                    fileNameDisplay.style.fontWeight = 'normal';
                } else {
                    showAlert(data.message || 'Erreur lors de l\'importation', 'error');
                }
            })
            .catch(error => {
                hideLoader();
                console.error('Erreur lors de l\'importation:', error);
                showAlert('Erreur lors de l\'importation. Veuillez réessayer.', 'error');
            })
            .finally(() => {
                // Réactiver le bouton
                importBtn.disabled = false;
                importBtn.style.cursor = 'pointer';
                importBtn.innerHTML = '<i class="fas fa-upload"></i> Importer du vocabulaire';
            });
        });
    }
    
    // === GESTION DU FORMULAIRE MULTI-MOTS ===
    if (addRowButton && wordRows) {
      // Ajouter une nouvelle ligne
      addRowButton.addEventListener('click', function() {
            const newRow = createNewRow();
            wordRows.appendChild(newRow);
            
            // Animation d'apparition
            newRow.style.opacity = '0';
            newRow.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                newRow.style.transition = 'all 0.3s ease';
                newRow.style.opacity = '1';
                newRow.style.transform = 'translateY(0)';
            }, 100);
            
            // Configurer les écouteurs
            setupRemoveRowListeners();
            setupValidationListeners();
            
            // Focus sur le premier champ de la nouvelle ligne
            const firstInput = newRow.querySelector('input[name="words[]"]');
            if (firstInput) {
                firstInput.focus();
            }
            
            // Mettre à jour le compteur de lignes
            updateRowCounter();
        });
        
        // Validation du formulaire multi-mots
        if (multiWordForm) {
            multiWordForm.addEventListener('submit', function(e) {
                if (!validateMultiWordForm()) {
                    e.preventDefault();
                    return;
                }
                
                // Afficher un loader pour la soumission
                const submitBtn = this.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
                    
                    // Réactiver le bouton après 10 secondes (au cas où)
                    setTimeout(() => {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer tous les mots';
                    }, 10000);
                }
            });
        }
        
        // Configurer les écouteurs initiaux
        setupRemoveRowListeners();
        setupValidationListeners();
        updateRowCounter();
    }
    
    // === FONCTIONS UTILITAIRES ===
    
    function createNewRow() {
        const newRow = document.createElement('tr');
        newRow.className = 'word-row';
        newRow.innerHTML = `
          <td><input type="text" name="words[]" required placeholder="Mot" class="form-control"></td>
          <td><input type="text" name="language_codes[]" required placeholder="Langue" class="form-control"></td>
          <td><input type="text" name="subjects[]" required placeholder="Sujet" class="form-control"></td>
          <td>
            <select name="types[]" required class="form-control">
              <option value="" disabled selected>Type</option>
              <option value="noun">Nom</option>
              <option value="verb">Verbe</option>
              <option value="adjective">Adjectif</option>
              <option value="adverb">Adverbe</option>
              <option value="ph.v">Ph.V</option>
              <option value="idiom">Idiom</option>
              <option value="collocation">Colloc</option>
            </select>
          </td>
          <td><input type="text" name="pronunciations[]" placeholder="Prononciation" class="form-control"></td>
          <td><input type="text" name="meanings[]" required placeholder="Signification" class="form-control"></td>
          <td><input type="text" name="examples[]" required placeholder="Exemple" class="form-control"></td>
          <td><input type="text" name="synonyms[]" placeholder="Synonymes" class="form-control"></td>
          <td><input type="text" name="antonyms[]" placeholder="Antonymes" class="form-control"></td>
          <td><input type="text" name="grammars[]" placeholder="Grammaire" class="form-control"></td>
          <td>
            <select name="levels[]" required class="form-control">
              <option value="x">Niveau x</option>
              <option value="0">Niveau 0</option>
              <option value="1">Niveau 1</option>
              <option value="2">Niveau 2</option>
                    <option value="v">Niveau v</option>
            </select>
          </td>
          <td>
                <button type="button" class="btn btn-danger remove-row" title="Supprimer cette ligne">
                    <i class="fas fa-trash"></i>
                </button>
          </td>
        `;
        return newRow;
    }
    
      function setupRemoveRowListeners() {
        document.querySelectorAll('.remove-row').forEach(button => {
            // Supprimer les anciens écouteurs pour éviter les doublons
            button.removeEventListener('click', handleRemoveRow);
            button.addEventListener('click', handleRemoveRow);
        });
    }
    
    function handleRemoveRow(e) {
        const row = e.target.closest('.word-row');
        const totalRows = wordRows.querySelectorAll('.word-row').length;
        
        if (totalRows > 1) {
            // Animation de disparition
            row.style.transition = 'all 0.3s ease';
            row.style.opacity = '0';
            row.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                row.remove();
                updateRowCounter();
                // Réorganiser les index si nécessaire
                reindexRows();
            }, 300);
            } else {
            showAlert('Vous devez avoir au moins une ligne', 'error');
            // Animation de secousse
            row.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                row.style.animation = '';
            }, 500);
        }
    }
    
    function setupValidationListeners() {
        // Validation en temps réel
        const requiredFields = document.querySelectorAll('input[required], select[required]');
        requiredFields.forEach(field => {
            field.addEventListener('blur', function() {
                validateField(this);
            });
            
            field.addEventListener('input', function() {
                // Supprimer les styles d'erreur lors de la saisie
                this.style.borderColor = '';
                this.style.boxShadow = '';
                
                // Validation spécifique pour certains champs
                if (this.name === 'language_codes[]') {
                    validateLanguageCode(this);
            }
          });
        });
      }
      
    function validateField(field) {
        const isValid = field.checkValidity();
        
        if (!isValid) {
            field.style.borderColor = '#e53e3e';
            field.style.boxShadow = '0 0 0 3px rgba(229, 62, 62, 0.1)';
        } else {
            field.style.borderColor = '#38a169';
            field.style.boxShadow = '0 0 0 3px rgba(56, 161, 105, 0.1)';
            
            // Remettre les styles normaux après un délai
            setTimeout(() => {
                field.style.borderColor = '';
                field.style.boxShadow = '';
            }, 2000);
        }
        
        return isValid;
    }
    
    function validateLanguageCode(field) {
        const value = field.value.trim();
        if (value && value.length > 5) {
            field.setCustomValidity('Le code de langue ne doit pas dépasser 5 caractères');
        } else {
            field.setCustomValidity('');
        }
    }
    
    function validateMultiWordForm() {
        const rows = wordRows.querySelectorAll('.word-row');
        let isValid = true;
        let errorCount = 0;
        
        rows.forEach((row, index) => {
            const requiredFields = row.querySelectorAll('input[required], select[required]');
            
            requiredFields.forEach(field => {
                if (!validateField(field)) {
                    isValid = false;
                    errorCount++;
                }
            });
        });
        
        if (!isValid) {
            showAlert(`Veuillez corriger les ${errorCount} erreur(s) dans le formulaire`, 'error');
            
            // Faire défiler vers le premier champ d'erreur
            const firstError = document.querySelector('input[style*="border-color: rgb(229, 62, 62)"], select[style*="border-color: rgb(229, 62, 62)"]');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.focus();
            }
        }
        
        return isValid;
    }
    
    function updateRowCounter() {
        const rowCount = wordRows.querySelectorAll('.word-row').length;
        const counter = document.querySelector('.row-counter');
        
        if (counter) {
            counter.textContent = `${rowCount} ligne(s)`;
        } else {
            // Créer un compteur s'il n'existe pas
            const counterElement = document.createElement('span');
            counterElement.className = 'row-counter';
            counterElement.textContent = `${rowCount} ligne(s)`;
            counterElement.style.cssText = 'font-size: 0.9rem; color: #6b7280; font-weight: 500;';
            
            const actions = document.querySelector('.multiple-form-actions');
            if (actions) {
                actions.insertBefore(counterElement, actions.firstChild);
            }
        }
    }
    
    function reindexRows() {
        // Cette fonction peut être utilisée pour réorganiser les index des champs si nécessaire
        const rows = wordRows.querySelectorAll('.word-row');
        rows.forEach((row, index) => {
            // Ajouter des attributs data-index pour le suivi
            row.setAttribute('data-index', index);
        });
    }
    
    function showLoader() {
        if (loader && fileIcon && fileText) {
            loader.style.display = 'flex';
            fileIcon.style.display = 'none';
            fileText.style.display = 'none';
        }
    }
    
    function hideLoader() {
        if (loader && fileIcon && fileText) {
            loader.style.display = 'none';
            fileIcon.style.display = 'block';
            fileText.style.display = 'block';
        }
    }
    
    function showAlert(message, type = 'info') {
        // Supprimer les anciennes alertes
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());
        
        // Créer une nouvelle alerte
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${message}
            <button type="button" class="alert-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Ajouter des styles pour le bouton de fermeture
        const closeBtn = alertDiv.querySelector('.alert-close');
        if (closeBtn) {
            closeBtn.style.cssText = `
                background: none !important;
                border: none !important;
                color: inherit !important;
                cursor: pointer !important;
                margin-left: auto !important;
                padding: 0 5px !important;
                opacity: 0.7 !important;
                transition: opacity 0.3s ease !important;
            `;
            
            closeBtn.addEventListener('mouseenter', function() {
                this.style.opacity = '1';
            });
            
            closeBtn.addEventListener('mouseleave', function() {
                this.style.opacity = '0.7';
            });
        }
        
        // Insérer l'alerte au début du conteneur
        const container = document.querySelector('.vocabulary-container');
        if (container) {
            const title = container.querySelector('h1');
            if (title) {
                title.insertAdjacentElement('afterend', alertDiv);
            } else {
                container.insertBefore(alertDiv, container.firstChild);
            }
        }
        
        // Animation d'apparition
        alertDiv.style.opacity = '0';
        alertDiv.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            alertDiv.style.transition = 'all 0.3s ease';
            alertDiv.style.opacity = '1';
            alertDiv.style.transform = 'translateY(0)';
        }, 100);
        
        // Auto-suppression après 5 secondes (sauf pour les erreurs)
        if (type !== 'error') {
            setTimeout(() => {
                if (alertDiv.parentElement) {
                    alertDiv.style.opacity = '0';
                    alertDiv.style.transform = 'translateY(-20px)';
                    setTimeout(() => {
                        alertDiv.remove();
                    }, 300);
                }
            }, 5000);
        }
    }
    
    // === GESTION DES RACCOURCIS CLAVIER ===
    document.addEventListener('keydown', function(e) {
        // Ctrl+Enter pour soumettre le formulaire
        if (e.ctrlKey && e.key === 'Enter') {
            const activeForm = document.activeElement.closest('form');
            if (activeForm) {
                activeForm.requestSubmit();
            }
        }
        
        // Échap pour fermer les alertes
        if (e.key === 'Escape') {
            const alerts = document.querySelectorAll('.alert');
            alerts.forEach(alert => alert.remove());
        }
    });
    
    // === GESTION DES ERREURS GLOBALES ===
    window.addEventListener('error', function(e) {
        console.error('Erreur JavaScript:', e.error);
        showAlert('Une erreur inattendue s\'est produite. Veuillez rafraîchir la page.', 'error');
    });
    
    // === NETTOYAGE AU DÉCHARGEMENT DE LA PAGE ===
    window.addEventListener('beforeunload', function(e) {
        // Vérifier s'il y a des données non sauvegardées
        const hasUnsavedData = checkUnsavedData();
        if (hasUnsavedData) {
            const message = 'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter?';
            e.returnValue = message;
            return message;
        }
    });
    
    function checkUnsavedData() {
        const inputs = document.querySelectorAll('input[type="text"], select, textarea');
        return Array.from(inputs).some(input => input.value.trim() !== '');
    }
    
    // === AJOUT DE STYLES CSS DYNAMIQUES ===
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        
        .alert {
            position: relative;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .alert-close {
            background: none !important;
            border: none !important;
            color: inherit !important;
            cursor: pointer !important;
            margin-left: auto !important;
            padding: 0 5px !important;
            opacity: 0.7 !important;
            transition: opacity 0.3s ease !important;
        }
        
        .alert-close:hover {
            opacity: 1 !important;
        }
        
        .row-counter {
            font-size: 0.9rem;
            color: #6b7280;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }
        
        .row-counter::before {
            content: "📊";
            font-size: 1rem;
        }
        
        .form-control.error {
            border-color: #e53e3e !important;
            box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1) !important;
        }
        
        .form-control.success {
            border-color: #38a169 !important;
            box-shadow: 0 0 0 3px rgba(56, 161, 105, 0.1) !important;
        }
        
        .loading {
            pointer-events: none;
            opacity: 0.7;
        }
        
        .fade-in {
            animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
    
    // === INITIALISATION TERMINÉE ===
    console.log('AddWord.js initialisé avec succès');
  });
