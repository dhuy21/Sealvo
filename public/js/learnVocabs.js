document.addEventListener('DOMContentLoaded', function() {
    // Récupérer les mots depuis un attribut data de l'élément HTML
    // ou depuis une variable globale définie dans le template
    let allWords = [];
    
    // Essayer de récupérer les mots depuis un élément avec un attribut data
    const wordsContainer = document.getElementById('words-data');
    if (wordsContainer && wordsContainer.dataset.words) {
        try {
            allWords = JSON.parse(wordsContainer.dataset.words);
        } catch (e) {
            console.error('Erreur lors du parsing des mots:', e);
        }
    } 
    // Si pas trouvé et qu'une variable globale existe (définie dans le template)
    else if (typeof window.vocabularyWords !== 'undefined') {
        allWords = window.vocabularyWords;
    }
    
    let currentWords = [...allWords]; // Copie pour permettre le filtrage
    let currentIndex = 0;
    let progress = []; // Pour suivre les progrès (0: ne sait pas, 1: incertain, 2: sait)
    let sessionStartTime = new Date();
    let achievements = {
      fiveWords: false,
      tenWords: false,
      allWords: false
    };
    
    // Données pour la répétition espacée
    const spacedRepetition = {
      enabled: false,
      words: [],
      nextReviewTimes: {}
    };
    
    // Éléments DOM
    let flashcard = document.getElementById('flashcard');
    const currentCardEl = document.getElementById('current-card');
    const totalCardsEl = document.getElementById('total-cards');
    const prevBtn = document.getElementById('prev-card');
    const nextBtn = document.getElementById('next-card');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const shuffleBtn = document.getElementById('shuffle-cards');
    const resetBtn = document.getElementById('reset-progress');
    const saveBtn = document.getElementById('save-progress');
    const sessionTimeEl = document.getElementById('session-time');
    const knownCountEl = document.getElementById('known-count');
    const notKnownCountEl = document.getElementById('not-known-count');
    const uncertainCountEl = document.getElementById('uncertain-count');
    const masteredCountEl = document.getElementById('mastered-count');
    const achievementPopup = document.getElementById('achievement-popup');
    const achievementText = document.getElementById('achievement-text');
    const closeAchievementBtn = document.getElementById('close-achievement');
    const hintBtn = document.getElementById('hint-button');
    const hintText = document.getElementById('hint-text');
    
    const levelCheckboxes = [
      document.getElementById('level0'),
      document.getElementById('level1'),
      document.getElementById('level2')
    ];
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    
    // Initialiser les progrès
    function initProgress() {
      progress = new Array(currentWords.length).fill(-1); // -1 = non vu
      updateProgressDisplay();
    }
    
    // Mettre à jour l'affichage des progrès
    function updateProgressDisplay() {
      const seen = progress.filter(p => p >= 0).length;
      const notKnown = progress.filter(p => p === 0).length;
      const uncertain = progress.filter(p => p === 1).length;
      const known = progress.filter(p => p === 2).length;
      
      const progressPercent = currentWords.length > 0 ? Math.round((seen / currentWords.length) * 100) : 0;
      
      // Mettre à jour la barre de progression
      progressBar.style.width = `${progressPercent}%`;
      progressText.textContent = `${progressPercent}%`;
      
      // Mettre à jour les compteurs
      notKnownCountEl.textContent = notKnown;
      uncertainCountEl.textContent = uncertain;
      masteredCountEl.textContent = known;
      knownCountEl.textContent = known;
      
      // Vérifier les réalisations
      checkAchievements(known);
    }
    
    // Vérifier et afficher les réalisations
    function checkAchievements(knownCount) {
      if (knownCount >= 5 && !achievements.fiveWords) {
        achievements.fiveWords = true;
        showAchievement('Vous avez maîtrisé 5 mots !');
      } else if (knownCount >= 10 && !achievements.tenWords) {
        achievements.tenWords = true;
        showAchievement('Vous avez maîtrisé 10 mots !');
      } else if (knownCount === currentWords.length && currentWords.length > 0 && !achievements.allWords) {
        achievements.allWords = true;
        showAchievement('Félicitations ! Vous avez maîtrisé tous les mots !');
      }
    }
    
    // Afficher une réalisation
    function showAchievement(text) {
      achievementText.textContent = text;
      achievementPopup.classList.add('show');
      
      // Jouer un son de réussite si disponible
      
    }
    
    
    // Mettre à jour l'affichage de la carte
    function updateCardDisplay() {
      if (currentWords.length === 0) {
        flashcard.innerHTML = `
          <div class="flashcard-inner">
            <div class="flashcard-front">
              <h2 class="card-content">Aucun mot disponible</h2>
              <p class="card-prompt">Ajustez vos filtres ou ajoutez plus de mots</p>
            </div>
          </div>
        `;
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        currentCardEl.textContent = '0';
        totalCardsEl.textContent = '0';
        return;
      }
      
      const word = currentWords[currentIndex];
      const mode = document.querySelector('input[name="mode"]:checked').value;
      
      // Déterminer le contenu de la carte en fonction du mode
      let frontContent, backContent;
      
      if (mode === 'word-to-meaning') {
        frontContent = word.word;
        backContent = word.meaning;
      } else if (mode === 'meaning-to-word') {
        frontContent = word.meaning;
        backContent = word.word;
      } else if (mode === 'spaced-repetition') {
        // Dans ce mode, on garde word-to-meaning mais on change l'ordre des mots
        frontContent = word.word;
        backContent = word.meaning;
      }
      
      // Mettre à jour la carte avec une animation
      flashcard.classList.add('wiggle');
      setTimeout(() => {
        flashcard.classList.remove('wiggle');
      }, 500);
      
      // Mettre à jour le contenu de la carte
      flashcard.innerHTML = `
        <div class="flashcard-inner">
          <div class="flashcard-front">
            <span class="card-type">${word.type}</span>
            <h2 class="card-content">${frontContent}</h2>
            <div class="hint-container">
              <button id="hint-button" class="hint-btn"><i class="fas fa-lightbulb"></i> Indice</button>
              <p id="hint-text" class="hint-text"></p>
            </div>
            <p class="card-prompt">Cliquez pour voir la traduction</p>
          </div>
          <div class="flashcard-back">
            <span class="card-type">${word.type}</span>
            <h2 class="card-content">${backContent}</h2>
            <div class="card-details">
              <p><strong>Exemple:</strong> <span class="example-text">${word.example}</span></p>
              ${word.pronunciation ? `
                <p><strong>Prononciation:</strong> <span class="pronunciation-text">${word.pronunciation}</span></p>
                <button class="pronunciation-btn" data-text="${word.word}">
                  <i class="fas fa-volume-up"></i> Écouter
                </button>
              ` : ''}
              ${word.synonyms ? `<p><strong>Synonymes:</strong> ${word.synonyms}</p>` : ''}
              ${word.antonyms ? `<p><strong>Antonymes:</strong> ${word.antonyms}</p>` : ''}
            </div>
          </div>
        </div>
      `;
      
      // Rétablir les écouteurs d'événements pour les nouveaux éléments
      setupCardListeners();
      
      // Mettre à jour l'indice de carte courant
      currentCardEl.textContent = currentIndex + 1;
      totalCardsEl.textContent = currentWords.length;
      
      // Mettre à jour les boutons de navigation
      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex === currentWords.length - 1;
      
      // S'assurer que la carte est sur le côté question
      flashcard.classList.remove('flipped');
    }
    
    // Configurer les écouteurs d'événements pour les éléments de la carte
    function setupCardListeners() {
      // Cliquer sur la carte pour la retourner
      const flashcardElement = document.getElementById('flashcard');
      
      // Supprimer les anciens écouteurs d'événements (si possible)
      const newFlashcard = flashcardElement.cloneNode(true);
      flashcardElement.parentNode.replaceChild(newFlashcard, flashcardElement);
      
      // Ajouter le nouvel écouteur d'événements
      newFlashcard.addEventListener('click', function() {
        if (currentWords.length > 0) {
          this.classList.toggle('flipped');
        }
      });
      
      // Mise à jour de la référence flashcard
      flashcard = newFlashcard;
      
      // Bouton d'indice
      const hintBtn = document.getElementById('hint-button');
      const hintText = document.getElementById('hint-text');
      
      if (hintBtn && hintText) {
        hintBtn.addEventListener('click', function(e) {
          e.stopPropagation(); // Empêcher la propagation au flashcard
          
          const word = currentWords[currentIndex];
          const mode = document.querySelector('input[name="mode"]:checked').value;
          
          if (mode === 'word-to-meaning') {
            // Donner un indice sur la signification
            const meaning = word.meaning;
            if (meaning.length > 2) {
              hintText.textContent = `Commence par "${meaning.charAt(0)}${meaning.charAt(1)}..." et contient ${meaning.length} caractères`;
            } else {
              hintText.textContent = 'Indice non disponible pour ce mot';
            }
          } else {
            // Donner un indice sur le mot
            const targetWord = word.word;
            if (targetWord.length > 2) {
              hintText.textContent = `Commence par "${targetWord.charAt(0)}${targetWord.charAt(1)}..." et contient ${targetWord.length} caractères`;
            } else {
              hintText.textContent = 'Indice non disponible pour ce mot';
            }
          }
        });
      }
      
      // Bouton de prononciation
      const pronunciationBtn = document.querySelector('.pronunciation-btn');
      if (pronunciationBtn) {
        pronunciationBtn.addEventListener('click', function(e) {
          e.stopPropagation(); // Empêcher la propagation au flashcard
          
          const text = this.getAttribute('data-text');
          speakText(text);
        });
      }
    }
    
    // Fonction pour prononcer un texte avec l'API Speech Synthesis
    function speakText(text) {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US'; // Langue anglaise
        speechSynthesis.speak(utterance);
      }
    }
    
    // Filtrer les mots en fonction des niveaux sélectionnés
    function filterWords() {
      const selectedLevels = [];
      levelCheckboxes.forEach((checkbox, index) => {
        if (checkbox.checked) {
          selectedLevels.push(index.toString());
        }
      });
      
      // Si le mode répétition espacée est activé
      const mode = document.querySelector('input[name="mode"]:checked').value;
      if (mode === 'spaced-repetition') {
        setupSpacedRepetition(selectedLevels);
      } else {
        // Mode normal
        currentWords = allWords.filter(word => selectedLevels.includes(word.level));
      }
      
      // Réinitialiser l'index si nécessaire
      if (currentIndex >= currentWords.length) {
        currentIndex = Math.max(0, currentWords.length - 1);
      }
      
      // Réinitialiser les progrès
      initProgress();
      
      // Mettre à jour l'affichage
      updateCardDisplay();
    }
    
    // Configurer le mode de répétition espacée
    function setupSpacedRepetition(selectedLevels) {
      spacedRepetition.enabled = true;
      
      // Filtrer les mots par niveaux sélectionnés
      const filteredWords = allWords.filter(word => selectedLevels.includes(word.level));
      
      // Si c'est la première fois, initialiser les temps de révision
      if (Object.keys(spacedRepetition.nextReviewTimes).length === 0) {
        filteredWords.forEach(word => {
          spacedRepetition.nextReviewTimes[word.id] = Date.now();
        });
      }
      
      // Trier les mots par temps de révision (les plus urgents d'abord)
      const sortedWords = [...filteredWords].sort((a, b) => {
        const timeA = spacedRepetition.nextReviewTimes[a.id] || 0;
        const timeB = spacedRepetition.nextReviewTimes[b.id] || 0;
        return timeA - timeB;
      });
      
      currentWords = sortedWords;
    }
    
    // Mettre à jour le temps de révision pour un mot dans le système de répétition espacée
    function updateSpacedRepetitionTime(wordId, knowledgeLevel) {
      const now = Date.now();
      let delay = 0;
      
      // Ajuster le délai en fonction du niveau de connaissance
      switch (knowledgeLevel) {
        case 0: // Ne sait pas
          delay = 1 * 60 * 1000; // 1 minute
          break;
        case 1: // Incertain
          delay = 10 * 60 * 1000; // 10 minutes
          break;
        case 2: // Sait
          delay = 24 * 60 * 60 * 1000; // 1 jour
          break;
      }
      
      spacedRepetition.nextReviewTimes[wordId] = now + delay;
    }
    
    // Mélanger les mots
    function shuffleWords() {
      for (let i = currentWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentWords[i], currentWords[j]] = [currentWords[j], currentWords[i]];
      }
      
      // Réinitialiser l'index et les progrès
      currentIndex = 0;
      initProgress();
      
      // Mettre à jour l'affichage
      updateCardDisplay();
    }
    
    // Mettre à jour le chronomètre de session
    function updateSessionTimer() {
      const now = new Date();
      const elapsedTime = Math.floor((now - sessionStartTime) / 1000);
      const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
      const seconds = (elapsedTime % 60).toString().padStart(2, '0');
      
      sessionTimeEl.textContent = `${minutes}:${seconds}`;
    }
    
    // Sauvegarder les progrès dans le localStorage
    function saveProgress() {
      try {
        const progressData = {
          date: new Date().toISOString(),
          progress: progress,
          words: currentWords.map(w => w.id),
          achievements: achievements
        };
        
        localStorage.setItem('flashcards_progress', JSON.stringify(progressData));
        
        // Afficher un message de confirmation
        showAchievement('Progrès sauvegardé avec succès !');
      } catch (e) {
        console.error('Erreur lors de la sauvegarde des progrès', e);
      }
    }
    
    // Charger les progrès depuis le localStorage
    function loadProgress() {
      try {
        const savedData = localStorage.getItem('flashcards_progress');
        if (savedData) {
          const data = JSON.parse(savedData);
          
          // Vérifier si les IDs des mots correspondent
          const currentIds = currentWords.map(w => w.id);
          const savedIds = data.words;
          
          // Si les ensembles de mots sont identiques, restaurer les progrès
          if (savedIds.length === currentIds.length && 
              savedIds.every(id => currentIds.includes(id))) {
            progress = data.progress;
            achievements = data.achievements || achievements;
            updateProgressDisplay();
            
            showAchievement('Progrès chargé avec succès !');
          }
        }
      } catch (e) {
        console.error('Erreur lors du chargement des progrès', e);
      }
    }
    
    // Gestion des événements
    
    // Navigation entre les cartes
    prevBtn.addEventListener('click', function() {
      if (currentIndex > 0) {
        currentIndex--;
        updateCardDisplay();
      }
    });
    
    nextBtn.addEventListener('click', function() {
      if (currentIndex < currentWords.length - 1) {
        currentIndex++;
        updateCardDisplay();
      }
    });
    
    // Boutons de connaissance
    document.querySelectorAll('.knowledge-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const level = parseInt(this.getAttribute('data-level'));
        
        // Enregistrer le niveau de connaissance
        progress[currentIndex] = level;
        
        // Si mode répétition espacée, mettre à jour le temps de révision
        if (spacedRepetition.enabled) {
          updateSpacedRepetitionTime(currentWords[currentIndex].id, level);
        }
        
        // Mettre à jour l'affichage des progrès
        updateProgressDisplay();
        
        // Animation de feedback
        flashcard.classList.add('wiggle');
        setTimeout(() => {
          flashcard.classList.remove('wiggle');
        }, 500);
        
        // Passer à la carte suivante s'il y en a une
        if (currentIndex < currentWords.length - 1) {
          currentIndex++;
          updateCardDisplay();
        } else {
          // C'était la dernière carte
          showAchievement('Vous avez terminé cette série !');
        }
      });
    });
    
    // Filtres de niveau
    levelCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', filterWords);
    });
    
    // Changement de mode
    modeRadios.forEach(radio => {
      radio.addEventListener('change', function() {
        const mode = this.value;
        
        if (mode === 'spaced-repetition') {
          // Activer le mode répétition espacée
          filterWords();
        } else {
          // Désactiver le mode répétition espacée
          spacedRepetition.enabled = false;
          filterWords();
        }
      });
    });
    
    // Mélanger les cartes
    shuffleBtn.addEventListener('click', shuffleWords);
    
    // Réinitialiser les progrès
    resetBtn.addEventListener('click', function() {
      // Demander confirmation
      if (confirm('Êtes-vous sûr de vouloir réinitialiser votre progression ?')) {
        currentIndex = 0;
        initProgress();
        updateCardDisplay();
      }
    });
    
    // Sauvegarder les progrès
    saveBtn.addEventListener('click', saveProgress);
    
    // Clavier: gauche/droite pour naviguer, espace pour retourner
    document.addEventListener('keydown', function(e) {
      if (currentWords.length === 0) return;
      
      if (e.code === 'ArrowLeft' && currentIndex > 0) {
        currentIndex--;
        updateCardDisplay();
      } else if (e.code === 'ArrowRight' && currentIndex < currentWords.length - 1) {
        currentIndex++;
        updateCardDisplay();
      } else if (e.code === 'Space') {
        flashcard.classList.toggle('flipped');
        e.preventDefault(); // Empêcher le défilement de la page
      } else if (e.code === 'Digit1' || e.code === 'Numpad1') {
        // Touche 1: Je ne sais pas
        document.querySelector('.knowledge-btn[data-level="0"]').click();
      } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
        // Touche 2: Incertain
        document.querySelector('.knowledge-btn[data-level="1"]').click();
      } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
        // Touche 3: Je sais
        document.querySelector('.knowledge-btn[data-level="2"]').click();
      }
    });
    
    // Mettre à jour le chronomètre toutes les secondes
    setInterval(updateSessionTimer, 1000);
    
    // Prévenir la fermeture accidentelle de la page
    window.addEventListener('beforeunload', function(e) {
      // Si l'utilisateur a progressé sans sauvegarder
      const hasUnsavedProgress = progress.some(p => p !== -1);
      if (hasUnsavedProgress) {
        e.preventDefault();
        e.returnValue = 'Vous avez des progrès non sauvegardés. Êtes-vous sûr de vouloir quitter ?';
      }
    });
    
    // Initialisation
    initProgress();
    updateCardDisplay();
    loadProgress(); // Essayer de charger les progrès sauvegardés
    setupCardListeners();
  });
