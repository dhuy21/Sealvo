

document.addEventListener('DOMContentLoaded', function() {

    
    // Éléments DOM - Import de fichiers
    const fileInput = document.getElementById('vocab-file');
    const fileNameDisplay = document.querySelector('.selected-file-name');
    const importBtn = document.getElementById('import-btn');
    const importForm = document.querySelector('.import-form');
    const loader = document.getElementById('loader');
    const fileIcon = document.getElementById('file-icon');
    const fileText = document.getElementById('file-text');
    
    // Éléments DOM - Formulaire multi-mots
    const addRowButton = document.getElementById('add-row');
    const wordRows = document.getElementById('word-rows');
    const saveWordsButton = document.getElementById('save-words');
    const multiWordForm = document.querySelector('.multiple-words-form');
    
    // Compteurs
    let cardCounter = 1;
    
    
    // ========================================
    // INITIALISATION
    // ========================================
    
    function init() {
        initFileImport();
        initWordCards();
        initGlobalEventHandlers();
    }
    
    function initFileImport() {
    if (fileInput && fileNameDisplay) {
            fileInput.addEventListener('change', handleFileSelect);
        }
        
        if (importForm && importBtn) {
            importForm.addEventListener('submit', handleImportSubmit);
        }
    }
    
    function initWordCards() {
        if (addRowButton && wordRows) {
            // Event delegation : UN SEUL listener sur le conteneur parent
            wordRows.addEventListener('click', handleCardActions);
            wordRows.addEventListener('input', handleCardInput);
            wordRows.addEventListener('blur', handleCardBlur, true); // true = capture phase
            
            addRowButton.addEventListener('click', handleAddNewCard);
            
            if (multiWordForm) {
                multiWordForm.addEventListener('submit', handleMultiWordFormSubmit);
            }
        }
    }
    
    function initGlobalEventHandlers() {
        initBeforeUnloadHandler();
    }
    
    
    // ========================================
    // IMPORT DE FICHIERS
    // ========================================
    
    /**
     * Gère la sélection d'un fichier
     */
    function handleFileSelect(e) {
            const file = e.target.files[0];
        
        if (!file) {
            resetFileDisplay();
            return;
        }
        
        // Validation de la taille
        if (!validateFileSize(file)) {
            e.target.value = '';
            resetFileDisplay();
            return;
        }
        
        // Validation du type
        if (!validateFileType(file)) {
            e.target.value = '';
            resetFileDisplay();
            return;
        }
        
        // Afficher le nom du fichier
        displayFileName(file.name);
    }
    
    /**
     * Valide la taille du fichier (max 5MB)
     */
    function validateFileSize(file) {
                const maxSize = 5 * 1024 * 1024; // 5MB
        
                if (file.size > maxSize) {
                    showNotification('Le fichier est trop volumineux (max 5MB)', 'error');
            return false;
        }
        
        return true;
    }
    
    /**
     * Valide le type du fichier
     */
    function validateFileType(file) {
                const allowedTypes = [
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/vnd.ms-excel',
                ];
                
                if (!allowedTypes.includes(file.type)) {
            showNotification('Format de fichier non supporté. Utilisez Excel', 'error');
            return false;
        }
        
        return true;
    }
    
    /**
     * Affiche le nom du fichier sélectionné
     */
    function displayFileName(fileName) {
        fileNameDisplay.textContent = fileName;
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
    }
    
    /**
     * Réinitialise l'affichage du fichier
     */
    function resetFileDisplay() {
          fileNameDisplay.textContent = 'Aucun fichier sélectionné';
                fileNameDisplay.style.color = '#6b7280';
                fileNameDisplay.style.fontWeight = 'normal';
    }
    
    /**
     * Gère la soumission du formulaire d'importation
     */
    async function handleImportSubmit(e) {
        e.preventDefault();
            
            if (!fileInput.files.length) {
                showNotification('Veuillez sélectionner un fichier à importer', 'error');
                return;
            }
            
        // État de chargement
            showLoader();
        setImportButtonLoading(true);
        
        // Préparer et envoyer les données
            const formData = new FormData(importForm);
            
        try {
            const response = await fetch(importForm.action, {
                method: 'POST',
                body: formData
            })
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            const result = await response.json();
            
            if (result.success) {
                showNotification(result.message, 'success');
                resetImportForm();
                } else {
                throw new Error(result.message);
            }
        } catch(error) {
            console.error('Erreur:', error);
            showNotification('Une erreur est survenue. Veuillez réessayer plus tard.', 'error');
        } finally {
                hideLoader();
            setImportButtonLoading(false);
        }
    }
    
    /**
     * Définit l'état de chargement du bouton d'importation
     */
    function setImportButtonLoading(isLoading) {
        if (isLoading) {
            importBtn.disabled = true;
            importBtn.style.cursor = 'not-allowed';
            importBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importation en cours...';
        } else {
                importBtn.disabled = false;
                importBtn.style.cursor = 'pointer';
                importBtn.innerHTML = '<i class="fas fa-upload"></i> Importer du vocabulaire';
        }
    }
    
    /**
     * Réinitialise le formulaire d'importation
     */
    function resetImportForm() {
        importForm.reset();
        resetFileDisplay();
    }
    
    /**
     * Affiche le loader d'importation
     */
    function showLoader() {
        if (loader && fileIcon && fileText) {
            loader.style.display = 'flex';
            fileIcon.style.display = 'none';
            fileText.style.display = 'none';
        }
    }
    
    /**
     * Cache le loader d'importation
     */
    function hideLoader() {
        if (loader && fileIcon && fileText) {
            loader.style.display = 'none';
            fileIcon.style.display = 'block';
            fileText.style.display = 'block';
        }
    }
    
    
    // ========================================
    // GESTION DES CARTES
    // ========================================

    function handleCardActions(e) {
        const target = e.target.closest('button');
        
        if (!target) return;
        
        // Bouton de suppression
        if (target.classList.contains('btn-remove')) {
            handleRemoveCard(e);
        }
        
        // Bouton de collapse/expand
        if (target.classList.contains('btn-collapse')) {
            handleCollapseCard(e);
        }
        
        // Bouton de duplication
        if (target.classList.contains('btn-duplicate')) {
            handleDuplicateCard(e);
        }
    }
    
    /**
     * Gestionnaire central des inputs dans les cartes
     */
    function handleCardInput(e) {
        const target = e.target;
        
        // Mise à jour du titre de la carte
        if (target.name === 'words[]') {
            updateCardTitle(e);
        }
        
        // Validation en temps réel
        if (target.required || target.hasAttribute('required')) {
            handleFieldInput.call(target);
        }
    }
    
    /**
     * Gestionnaire central des blur dans les cartes (Event Delegation)
     */
    function handleCardBlur(e) {
        const target = e.target;
        
        // Validation lors de la perte de focus
        if (target.required || target.hasAttribute('required') || 
            target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
            handleFieldValidation.call(target);
        }
    }
    
    /**
     * Crée une nouvelle carte de mot
     */
    function createNewCard(index) {
        const card = document.createElement('div');
        card.className = 'word-card-form';
        card.setAttribute('data-index', index - 1);
        
        card.innerHTML = `
          <div class="card-header">
            <div class="card-title">
              <span class="card-number">${index}</span>
              <h3>Nouveau mot</h3>
            </div>
            <div class="card-actions">
              <button type="button" class="btn-icon btn-duplicate" title="Dupliquer">
                <i class="fas fa-copy"></i>
              </button>
              <button type="button" class="btn-icon btn-collapse" title="Réduire/Agrandir">
                <i class="fas fa-chevron-up"></i>
              </button>
              <button type="button" class="btn-icon btn-remove" title="Supprimer">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>

          <div class="card-body">
            <!-- Section: Informations de base -->
            <div class="form-section">
              <div class="section-title">
                <i class="fas fa-info-circle"></i>
                <span>Informations de base</span>
              </div>
              <div class="form-grid">
                <div class="form-group full-width">
                  <label for="word-${index - 1}">Mot *</label>
                  <input type="text" name="words[]" id="word-${index - 1}" required placeholder="Entrez le mot" class="form-control">
                </div>
                
                <div class="form-group">
                
                  <label for="language-${index - 1}">Langue *</label>
                  <select name="language_codes[]" id="language-0" required placeholder="ex: en, fr" class="form-control" >
                    <option value="en-US">en-US (English United States)</option>
                    <option value="en-GB">en-GB (English United Kingdom)</option>
                    <option value="fr-FR">fr-FR (French)</option>
                    <option value="es-ES">es-ES (Spanish Spain)</option>
                    <option value="de-DE">de-DE (German)</option>
                    <option value="it-IT">it-IT (Italian)</option>
                    <option value="ja-JP">ja-JP (Japanese)</option>
                    <option value="zh-CN">zh-CN (Chinese Simplified)</option>
                    <option value="zh-HK">zh-HK (Chinese Hong Kong)</option>
                    <option value="zh-TW">zh-TW (Chinese Traditional)</option>
                    <option value="pt-PT">pt-PT (Portuguese)</option>
                    <option value="ru-RU">ru-RU (Russian)</option>
                    <option value="vi-VN">vi-VN (Vietnamese)</option>
                    <option value="ko-KR">ko-KR (Korean)</option>
                    <option value="id-ID">id-ID (Indonesian)</option>
                    <option value="hi-IN">hi-IN (Hindi)</option>
                    <option value="pl-PL">pl-PL (Polish)</option>
                    <option value="nl-NL">nl-NL (Dutch)</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label for="subject-${index - 1}">Sujet *</label>
                  <input type="text" name="subjects[]" id="subject-${index - 1}" required placeholder="ex: Technology" class="form-control">
                </div>
                
                <div class="form-group">
                  <label for="type-${index - 1}">Type *</label>
                  <select name="types[]" id="type-${index - 1}" required class="form-control">
                    <option value="" disabled selected>Choisir un type</option>
              <option value="noun">Nom</option>
              <option value="verb">Verbe</option>
              <option value="adjective">Adjectif</option>
              <option value="adverb">Adverbe</option>
                    <option value="ph.v">Phrasal Verb</option>
              <option value="idiom">Idiom</option>
                    <option value="collocation">Collocation</option>
            </select>
                </div>
                
                <div class="form-group">
                  <label for="pronunciation-${index - 1}">Prononciation</label>
                  <input type="text" name="pronunciations[]" id="pronunciation-${index - 1}" placeholder="ex: /həˈloʊ/" class="form-control">
                </div>

                <div class="form-group">
                  <label for="level-${index - 1}">Niveau d'apprentissage *</label>
                  <select name="levels[]" id="level-${index - 1}" required class="form-control">
                    <option value="x">x - À réviser</option>
                    <option value="0">0 - Débutant</option>
                    <option value="1">1 - Intermédiaire</option>
                    <option value="2">2 - Avancé</option>
                    <option value="v">v - Maîtrisé</option>
            </select>
                </div>

              </div>
            </div>

            <!-- Section: Définition et exemples -->
            <div class="form-section">
              <div class="section-title">
                <i class="fas fa-book"></i>
                <span>Définition et exemples</span>
              </div>
              <div class="form-grid">
                <div class="form-group">
                  <label for="meaning-${index - 1}">Signification *</label>
                  <textarea name="meanings[]" id="meaning-${index - 1}" required placeholder="Entrez la signification du mot" class="form-control" rows="2"></textarea>
                </div>
                
                <div class="form-group">
                  <label for="example-${index - 1}">Exemple </label>
                  <textarea name="examples[]" id="example-${index - 1}" placeholder="Entrez un exemple d'utilisation" class="form-control" rows="2"></textarea>
                </div>
                
              </div>
            </div>

            <!-- Section: Détails grammaticaux -->
            <details class="form-section">
              <summary class="section-title">
                <i class="fas fa-graduation-cap"></i>
                <span>Plus de détails supplémentaires</span>
              </summary>
              <div class="form-grid">
              
                <div class="form-group">
                  <label for="synonyms-${index - 1}">Synonymes</label>
                  <input type="text" name="synonyms[]" id="synonyms-${index - 1}" placeholder="ex: happy, joyful" class="form-control">
                </div>
                
                <div class="form-group">
                  <label for="antonyms-${index - 1}">Antonymes</label>
                  <input type="text" name="antonyms[]" id="antonyms-${index - 1}" placeholder="ex: sad, unhappy" class="form-control">
                </div>

                <div class="form-group">
                  <label for="grammar-${index - 1}">Grammaire</label>
                  <input type="text" name="grammars[]" id="grammar-${index - 1}" placeholder="ex: irregular verb" class="form-control">
                </div>
                
              </div>
            </details>
          </div>
        `;
        
        return card;
    }
    
    /**
     * Gère l'ajout d'une nouvelle carte
     */
    function handleAddNewCard() {
        cardCounter++;
        const newCard = createNewCard(cardCounter);
        wordRows.appendChild(newCard);
        
        animateCardAppearance(newCard);
        focusFirstInput(newCard);
        scrollToCard(newCard);
        updateCardNumbers();
    }

    /**
     * Gère la suppression d'une carte
     */
    function handleRemoveCard(e) {
        const card = e.target.closest('.word-card-form');
        const totalCards = wordRows.querySelectorAll('.word-card-form').length;
        
        if (totalCards > 1) {
            animateCardRemoval(card, () => {
                card.remove();
                updateCardNumbers();
            });
        } else {
            showNotification('Vous devez avoir au moins une carte', 'error');
            shakeCard(card);
        }
    }
    
    /**
     * Gère le collapse/expand d'une carte
     */
    function handleCollapseCard(e) {
        const card = e.target.closest('.word-card-form');
        card.classList.toggle('collapsed');
    }
    
    /**
     * Gère la duplication d'une carte
     */
    function handleDuplicateCard(e) {
        const card = e.target.closest('.word-card-form');
        cardCounter++;
        const newCard = createNewCard(cardCounter);
        
        copyCardValues(card, newCard);
        insertCardAfter(card, newCard);
        animateCardAppearance(newCard);
        updateCardNumbers();
        showNotification('Carte dupliquée avec succès', 'success');
        scrollToCard(newCard);
    }
    
    /**
     * Copie les valeurs d'une carte vers une autre
     */
    function copyCardValues(sourceCard, targetCard) {
        const sourceInputs = sourceCard.querySelectorAll('input, select, textarea');
        const targetInputs = targetCard.querySelectorAll('input, select, textarea');
        
        sourceInputs.forEach((input, index) => {
            if (targetInputs[index]) {
                targetInputs[index].value = input.value;
            }
        });
    }
    
    /**
     * Insère une carte après une autre
     */
    function insertCardAfter(referenceCard, newCard) {
        referenceCard.insertAdjacentElement('afterend', newCard);
    }
    
    /**
     * Met à jour les numéros de toutes les cartes
     */
    function updateCardNumbers() {
        const cards = wordRows.querySelectorAll('.word-card-form');
        
        cards.forEach((card, index) => {
            const numberSpan = card.querySelector('.card-number');
            if (numberSpan) {
                numberSpan.textContent = index + 1;
            }
            card.setAttribute('data-index', index);
        });
        
        cardCounter = cards.length;
    }
    
    /**
     * Met à jour le titre d'une carte en fonction du mot saisi
     */
    function updateCardTitle(e) {
        const card = e.target.closest('.word-card-form');
        const title = card.querySelector('.card-title h3');
        const value = e.target.value.trim();
        
        title.textContent = value || 'Nouveau mot';
    }
    
    /**
     * Gère la soumission du formulaire multi-mots
     */
    async function handleMultiWordFormSubmit(e) {

        e.preventDefault();
        
        // Validation du formulaire
        if (!validateMultiWordForm()) {
            return;
        }
        
        
        setSubmitButtonLoading(true);
         // Envoyer les données
         const formData = new FormData(multiWordForm);

        try {
            const response = await fetch(multiWordForm.action, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Erreur réseau: ' + response.statusText);
            }
            
            const result = await response.json();
            
            if (result.success) {
                showNotification(result.message || 'Mots enregistrés avec succès !', 'success');
                resetMultiWordForm();
            } else {
                throw new Error(result.message || 'Erreur lors de l\'enregistrement');
            }
            
        } catch (error) {
            console.error('Erreur:', error);
            showNotification(error.message || 'Erreur lors de l\'enregistrement', 'error');
        } finally {
            // Réactiver le bouton en cas d'erreur
            setSubmitButtonLoading(false);
        }
    }
    
    /**
     * Définit l'état de chargement du bouton de soumission
     */
    function setSubmitButtonLoading(isLoading) {
        if (isLoading) {
            saveWordsButton.disabled = true;
            saveWordsButton.style.cursor= 'not-allowed'; 
            saveWordsButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
        }else {
            saveWordsButton.disabled = false;
            saveWordsButton.style.cursor= 'pointer'; 
            saveWordsButton.innerHTML = '<i class="fas fa-save"></i> Enregistrer tous les mots';
        }
    }
    
    /**
     * Réinitialise le bouton de soumission
     */
    function resetMultiWordForm() {
        multiWordForm.reset();
    }
    
    // ========================================
    // VALIDATION
    // ========================================
    
    /**
     * Gère la validation d'un champ lors du blur
     */
    function handleFieldValidation() {
                validateField(this);
    }
    
    /**
     * Gère l'input d'un champ
     */
    function handleFieldInput() {
        clearFieldValidationStyles(this);
        
                if (this.name === 'language_codes[]') {
                    validateLanguageCode(this);
            }
      }
      
    /**
     * Valide un champ de formulaire
     */
    function validateField(field) {
        const isValid = field.checkValidity();
        
        if (!isValid) {
            setFieldInvalidStyles(field);
        } else {
            setFieldValidStyles(field);
            
            setTimeout(() => {
                clearFieldValidationStyles(field);
            }, 2000);
        }
        
        return isValid;
    }
    
    /**
     * Applique les styles d'erreur à un champ
     */
    function setFieldInvalidStyles(field) {
        field.style.borderColor = '#ef4444';
        field.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';
    }
    
    /**
     * Applique les styles de validation réussie à un champ
     */
    function setFieldValidStyles(field) {
        field.style.borderColor = '#10b981';
        field.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1)';
    }
    
    /**
     * Supprime les styles de validation d'un champ
     */
    function clearFieldValidationStyles(field) {
        field.style.borderColor = '';
        field.style.boxShadow = '';
    }
    
    /**
     * Valide un code de langue
     */
    function validateLanguageCode(field) {
        const value = field.value.trim();
        
        if (value && value.length > 5) {
            field.setCustomValidity('Le code de langue ne doit pas dépasser 5 caractères');
        } else {
            field.setCustomValidity('');
        }
    }
    
    /**
     * Valide l'ensemble du formulaire multi-mots
     */
    function validateMultiWordForm() {
        const cards = wordRows.querySelectorAll('.word-card-form');
        let isValid = true;
        let errorCount = 0;
        
        cards.forEach((card) => {
            const requiredFields = card.querySelectorAll('input[required], select[required], textarea[required]');
            
            requiredFields.forEach(field => {
                if (!validateField(field)) {
                    isValid = false;
                    errorCount++;
                }
            });
        });
        
        if (!isValid) {
            showNotification(`Veuillez corriger les ${errorCount} erreur(s) dans le formulaire`, 'error');
            scrollToFirstError();
        }
        
        return isValid;
    }
    
    /**
     * Fait défiler jusqu'à la première erreur
     */
    function scrollToFirstError() {
        const firstError = document.querySelector(
            'input[style*="border-color: rgb(239, 68, 68)"], ' +
            'select[style*="border-color: rgb(239, 68, 68)"], ' +
            'textarea[style*="border-color: rgb(239, 68, 68)"]'
        );
        
        if (firstError) {
            expandCardIfCollapsed(firstError);
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstError.focus();
        }
    }
    
    /**
     * Développe une carte si elle est collapsed
     */
    function expandCardIfCollapsed(element) {
        const card = element.closest('.word-card-form');
        
        if (card && card.classList.contains('collapsed')) {
            card.classList.remove('collapsed');
        }
    }
    
    
    // ========================================
    //  UTILITAIRES & ANIMATIONS
    // ========================================
    
    /**
     * Anime l'apparition d'une carte
     */
    function animateCardAppearance(card) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100);
    }
    
    /**
     * Anime la suppression d'une carte
     */
    function animateCardRemoval(card, callback) {
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateX(-20px)';
        
        setTimeout(callback, 300);
    }
    
    /**
     * Fait trembler une carte (animation shake)
     */
    function shakeCard(card) {
        card.style.animation = 'shake 0.5s ease-in-out';
        
        setTimeout(() => {
            card.style.animation = '';
        }, 500);
    }
    
    /**
     * Met le focus sur le premier input d'une carte
     */
    function focusFirstInput(card) {
        const firstInput = card.querySelector('input[name="words[]"]');
        
        if (firstInput) {
            firstInput.focus();
        }
    }
    
    /**
     * Fait défiler jusqu'à une carte
     */
    function scrollToCard(card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    /**
     * Affiche une notification
     */
    function showNotification(message, type = 'info') {
        let notification = document.getElementById('notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            document.body.appendChild(notification);
        }
        
        const icon = getNotificationIcon(type);
        notification.innerHTML = icon + ' ' + message;
        notification.className = type;
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }
    
    /**
     * Retourne l'icône appropriée pour le type de notification
     */
    function getNotificationIcon(type) {
        const icons = {
            'success': '<i class="fas fa-check-circle"></i>',
            'error': '<i class="fas fa-exclamation-circle"></i>',
            'info': '<i class="fas fa-info-circle"></i>'
        };
        
        return icons[type] || icons.info;
    }
    
    /**
     * Vérifie s'il y a des données non sauvegardées
     */
    function checkUnsavedData() {
        const inputs = document.querySelectorAll('input[type="text"], select, textarea');
        
        return Array.from(inputs).some(input => {
            if (input.type === 'hidden' || input.name === 'isMultipleWords') {
                return false;
            }
            
            return input.value.trim() !== '' && input.value !== input.defaultValue;
        });
    }
    
    
    // ========================================
    // ÉVÉNEMENTS GLOBAUX
    // ========================================
    
    /**
     * Initialise le gestionnaire beforeunload
     */
    function initBeforeUnloadHandler() {
        window.addEventListener('beforeunload', handleBeforeUnload);
    }
    
    /**
     * Gère l'événement beforeunload (quitter la page)
     */
    function handleBeforeUnload(e) {
        if (checkUnsavedData()) {
            const message = 'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter?';
            e.returnValue = message;
            return message;
        }
    }
    
    // ========================================
    // LANCEMENT DE L'APPLICATION
    // ========================================
    
    init();
  });
