document.addEventListener('DOMContentLoaded', function() {
    // Récupérer les mots depuis un attribut data de l'élément HTML
    // ou depuis une variable globale définie dans le template
    let allWords = [];
    
    // Essayer de récupérer les mots depuis un élément avec un attribut data
    const wordsContainer = document.getElementById('words-data');
    if (wordsContainer && wordsContainer.dataset.words) {
        try {
            allWords = JSON.parse(wordsContainer.dataset.words);
            console.log(`Successfully loaded ${allWords.length} words from data attribute`);
        } catch (e) {
            console.error('Erreur lors du parsing des mots:', e);
        }
    } 
    // Si pas trouvé et qu'une variable globale existe (définie dans le template)
    else if (typeof window.vocabularyWords !== 'undefined') {
        allWords = window.vocabularyWords;
        console.log(`Successfully loaded ${allWords.length} words from global variable`);
    } else {
        console.error('No words found in data attribute or global variable');
    }
    
    let currentWords = [...allWords]; // Copie pour permettre le filtrage
    let currentIndex = 0;
    let progress = []; // Pour suivre les progrès (0: ne sait pas, 1: incertain, 2: sait)
    let sessionStartTime = new Date();
    
    
    // Streak update variables
    let streakUpdateTimeout = null;
    let streakUpdated = false;
    const STREAK_UPDATE_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
    
   
    
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
    
    const levelCheckboxes = [
      document.getElementById('levelx'),
      document.getElementById('level0'),
      document.getElementById('level1'),
      document.getElementById('level2')
    ];
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    
    // Animation pour les boutons
    const animateButtonPress = (button) => {
      button.classList.add('button-press');
      setTimeout(() => {
        button.classList.remove('button-press');
      }, 150);
    };
    
    // Ajouter des animations aux boutons
    document.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('mousedown', function() {
        animateButtonPress(this);
      });
    });
    
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
      
      // Mettre à jour la barre de progression avec animation
      progressBar.style.transition = 'width 0.7s cubic-bezier(0.19, 1, 0.22, 1)';
      progressBar.style.width = `${progressPercent}%`;
      progressText.textContent = `${progressPercent}%`;
      
      // Mettre à jour les compteurs avec animation
      animateCounter(notKnownCountEl, notKnown);
      animateCounter(uncertainCountEl, uncertain);
      animateCounter(masteredCountEl, known);
      animateCounter(knownCountEl, known);
      
      
    }
    
    // Animation pour les compteurs
    function animateCounter(element, targetValue) {
      const currentValue = parseInt(element.textContent);
      if (isNaN(currentValue) || currentValue === targetValue) {
        element.textContent = targetValue;
        return;
      }
      
      let startValue = currentValue;
      const duration = 500; // ms
      const startTime = performance.now();
      
      function updateCounter(timestamp) {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.floor(startValue + (targetValue - startValue) * progress);
        
        element.textContent = value;
        
        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        } else {
          element.textContent = targetValue;
        }
      }
      
      requestAnimationFrame(updateCounter);
    }
    
    
    
    
    // Mettre à jour l'affichage de la carte
    function updateCardDisplay() {
      console.log(`Updating card display. Currently have ${currentWords.length} words, index: ${currentIndex}`);
      
      if (currentWords.length === 0) {
        console.error('No words available to display');
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
      
      try {
        const word = currentWords[currentIndex];
        if (!word) {
          console.error(`Invalid word at index ${currentIndex}`);
          return;
        }
        
        const mode = document.querySelector('input[name="mode"]:checked').value;
        console.log(`Using mode: ${mode}`);
        
        // Déterminer le contenu de la carte en fonction du mode
        let frontContent, backContent;
        
        if (mode === 'word-to-meaning') {
          frontContent = word.word;
          backContent = word.meaning;
        } else if (mode === 'meaning-to-word') {
          frontContent = word.meaning;
          backContent = word.word;
        }
        
        // Validation
        if (!frontContent || !backContent) {
          console.error('Missing content for flashcard', { front: frontContent, back: backContent, word });
        }
        
        // Mettre à jour la carte avec une animation
        flashcard.classList.add('updating');
      
        // Add class for current mode
        flashcard.classList.remove('word-to-meaning-mode', 'meaning-to-word-mode');
        flashcard.classList.add(`${mode}-mode`);
      
        setTimeout(() => {
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
                  ${word.synonyms ? `<p><strong>Synonymes:</strong> ${word.synonyms}</p>` : ''}
                  ${word.antonyms ? `<p><strong>Antonymes:</strong> ${word.antonyms}</p>` : ''}
                  ${word.pronunciation ? `
                    <p><strong>Prononciation:</strong> <span class="pronunciation-text">${word.pronunciation}</span></p>
                    <button class="pronunciation-btn" data-text="${word.word}">
                      <i class="fas fa-volume-up"></i> Écouter
                    </button>
                  ` : ''}
                  
                </div>
              </div>
            </div>
          `;
          
          // Rétablir les écouteurs d'événements pour les nouveaux éléments
          setupCardListeners();
          
          // Mettre à jour l'indice de carte courant avec animation
          animateCounter(currentCardEl, currentIndex + 1);
          totalCardsEl.textContent = currentWords.length;
          
          // Mettre à jour les boutons de navigation
          prevBtn.disabled = currentIndex === 0;
          nextBtn.disabled = currentIndex === currentWords.length - 1;
          
          // S'assurer que la carte est sur le côté question
          flashcard.classList.remove('flipped');
          
          // Retirer la classe d'animation après mise à jour
          setTimeout(() => {
            flashcard.classList.remove('updating');
          }, 50);
        }, 150);
      } catch (e) {
        console.error('Erreur lors de la mise à jour de la carte:', e);
      }
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
          
          // Jouer un son léger de retournement
          try {
            const flipSound = new Audio('/sounds/flip.mp3');
            flipSound.volume = 0.2;
            flipSound.play();
          } catch (e) {
            console.log('Son non disponible');
          }
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
          
          // Animation du bouton d'indice
          this.classList.add('pulse');
          setTimeout(() => {
            this.classList.remove('pulse');
          }, 500);
          
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
          
          // Animation d'apparition du texte d'indice
          hintText.style.opacity = '0';
          hintText.style.transform = 'translateY(-10px)';
          hintText.style.display = 'block';
          
          // Clear hint after 5 seconds for meaning-to-word mode to prevent clutter
          if (mode === 'meaning-to-word') {
            setTimeout(() => {
              hintText.style.opacity = '0';
              setTimeout(() => {
                hintText.style.display = 'none';
              }, 500);
            }, 5000);
          }
          
          setTimeout(() => {
            hintText.style.opacity = '1';
            hintText.style.transform = 'translateY(0)';
          }, 10);
        });
      }
      
      // Bouton de prononciation
      const pronunciationBtn = document.querySelector('.pronunciation-btn');
      if (pronunciationBtn) {
        pronunciationBtn.addEventListener('click', function(e) {
          e.stopPropagation(); // Empêcher la propagation au flashcard
          
          // Animation du bouton
          this.classList.add('pulse');
          setTimeout(() => {
            this.classList.remove('pulse');
          }, 500);
          
          const text = this.getAttribute('data-text');
          speakText(text);
        });
      }
    }
    
    // Fonction pour prononcer un texte avec l'API Speech Synthesis
    function speakText(text) {
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set language to English
        utterance.lang = 'en-US';
        
        // Adjust rate (slightly slower)
        utterance.rate = 0.9;
        
        // Set pitch (slightly lower for better clarity)
        utterance.pitch = 1.0;
        
        // Detect iOS device
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        // Select the best voice available (prioritize female voices which are usually clearer)
        let voices = speechSynthesis.getVoices();
        
        // If voices array is empty, wait for them to load
        if (voices.length === 0) {
          speechSynthesis.addEventListener('voiceschanged', function() {
            voices = speechSynthesis.getVoices();
            selectAndSpeakWithBestVoice();
          }, { once: true });
        } else {
          selectAndSpeakWithBestVoice();
        }
        
        function selectAndSpeakWithBestVoice() {
          // Filter English voices
          let englishVoices = voices.filter(voice => voice.lang.includes('en-'));
          
          // Look for specific voices based on device
          if (isIOS) {
            // Try to use Samantha voice on iOS (high quality)
            const samanthaVoice = englishVoices.find(v => v.name.includes('Samantha'));
            if (samanthaVoice) utterance.voice = samanthaVoice;
          } else {
            // On other devices, prefer Google voices if available
            const googleVoice = englishVoices.find(v => v.name.includes('Google'));
            if (googleVoice) utterance.voice = googleVoice;
          }
          
          // If no specific voice was found, try any English female voice
          if (!utterance.voice) {
            const femaleVoice = englishVoices.find(v => v.name.includes('female') || v.name.includes('Female'));
            if (femaleVoice) utterance.voice = femaleVoice;
          }
          
          // Start speaking
          speechSynthesis.speak(utterance);
        }
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
      
      // Make sure we have at least one level selected
      if (selectedLevels.length === 0 && levelCheckboxes.length > 0) {
        // If no levels are selected, select the first one by default
        levelCheckboxes[0].checked = true;
        selectedLevels.push('0');
      }
      
      // Mode normal
      currentWords = allWords.filter(word => selectedLevels.includes(word.level));
      
      console.log(`Filtered words: ${currentWords.length} words match selected levels`);
      
      // Réinitialiser l'index si nécessaire
      if (currentIndex >= currentWords.length) {
        currentIndex = Math.max(0, currentWords.length - 1);
      }
      
      // Réinitialiser les progrès
      initProgress();
      
      // Mettre à jour l'affichage
      updateCardDisplay();
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
      
      // Animation de mélange
      document.querySelector('.flashcard-container').classList.add('shuffle-animation');
      setTimeout(() => {
        document.querySelector('.flashcard-container').classList.remove('shuffle-animation');
        // Mettre à jour l'affichage
        updateCardDisplay();
      }, 600);
    }
    
    // Mettre à jour le chronomètre de session
    function updateSessionTimer() {
      const now = new Date();
      const elapsedTime = Math.floor((now - sessionStartTime) / 1000);
      const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
      const seconds = (elapsedTime % 60).toString().padStart(2, '0');
      
      sessionTimeEl.textContent = `${minutes}:${seconds}`;
      
      // Check if we've reached 5 minutes (300 seconds) and haven't updated streak yet
      if (elapsedTime >= 300 && !streakUpdated) {
          updateUserStreak();
      }
    }
    
    // Sauvegarder les progrès dans le localStorage
    function saveProgress() {
      try {
        const progressData = {
          date: new Date().toISOString(),
          progress: progress,
          words: currentWords.map(w => w.id),
        };
        
        localStorage.setItem('flashcards_progress', JSON.stringify(progressData));
        
        // Animation de sauvegarde
        saveBtn.classList.add('saving');
        setTimeout(() => {
          saveBtn.classList.remove('saving');

        }, 500);
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
            
            updateProgressDisplay();

          }
        }
      } catch (e) {
        console.error('Erreur lors du chargement des progrès', e);
      }
    }
    
    // Function to update streak after 5 minutes
    function setupStreakUpdate() {
        // Clear any existing timeout
        if (streakUpdateTimeout) {
            clearTimeout(streakUpdateTimeout);
        }
        
        // Set a new timeout for 5 minutes
        streakUpdateTimeout = setTimeout(() => {
            // Only update once per session
            if (!streakUpdated) {
                updateUserStreak();
            }
        }, STREAK_UPDATE_TIME);
    }
    
    // Function to call the API to update streak
    function updateUserStreak() {
        fetch('/api/update-streak', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(response => response.json())
        .then(data => {
            console.log('Streak update response:', data);
            
            if (data.updated) {
                streakUpdated = true;
                //Notify in the page that the streak has been updated
                const streakUpdateNotification = document.getElementById('streak-update-notification');
                streakUpdateNotification.textContent = `🔥 Série de ${data.newStreak} jours! Continuez comme ça!`;
                streakUpdateNotification.classList.add('show');
                setTimeout(() => {
                    streakUpdateNotification.classList.remove('show');
                }, 5000);
            }
        })
        .catch(error => {
            console.error('Error updating streak:', error);
        });
    }
    
    
    // Navigation entre les cartes
    prevBtn.addEventListener('click', function() {
      if (currentIndex > 0) {
        // Animation de glissement
        flashcard.classList.add('slide-right');
        setTimeout(() => {
          currentIndex--;
          updateCardDisplay();
          flashcard.classList.remove('slide-right');
        }, 200);
      }
    });
    
    nextBtn.addEventListener('click', function() {
      if (currentIndex < currentWords.length - 1) {
        // Animation de glissement
        flashcard.classList.add('slide-left');
        setTimeout(() => {
          currentIndex++;
          updateCardDisplay();
          flashcard.classList.remove('slide-left');
        }, 200);
      }
    });
    
    // Boutons de connaissance
    document.querySelectorAll('.knowledge-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const level = parseInt(this.getAttribute('data-level'));
        
        // Enregistrer le niveau de connaissance
        progress[currentIndex] = level;
        
        // Mettre à jour l'affichage des progrès
        updateProgressDisplay();
        
        // Animation de feedback en fonction du niveau
        let animationClass = 'correct-answer';
        if (level === 0) animationClass = 'wrong-answer';
        else if (level === 1) animationClass = 'uncertain-answer';
        
        flashcard.classList.add(animationClass);
        setTimeout(() => {
          flashcard.classList.remove(animationClass);
          
          // Passer à la carte suivante s'il y en a une
          if (currentIndex < currentWords.length - 1) {
            flashcard.classList.add('slide-left');
            setTimeout(() => {
              currentIndex++;
              updateCardDisplay();
              flashcard.classList.remove('slide-left');
            }, 200);
          } else {
            // C'était la dernière carte
          }
        }, 500);
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
        console.log(`Switching to mode: ${mode}`);
        
        // Animation de transition
        document.querySelector('.flashcard-container').classList.add('mode-change');
        setTimeout(() => {
          document.querySelector('.flashcard-container').classList.remove('mode-change');
          
          // Just update the current card display without re-filtering words
          updateCardDisplay();
          
          // Log current state for debugging
          console.log(`After mode change to ${mode}: ${currentWords.length} words available`);
        }, 400);
      });
    });
    
    // Mélanger les cartes
    shuffleBtn.addEventListener('click', shuffleWords);
    
    // Réinitialiser les progrès
    resetBtn.addEventListener('click', function() {
      // Demander confirmation
      if (confirm('Êtes-vous sûr de vouloir réinitialiser votre progression ?')) {
        // Animation de réinitialisation
        document.querySelector('.progress-container').classList.add('reset-animation');
        setTimeout(() => {
          document.querySelector('.progress-container').classList.remove('reset-animation');
          currentIndex = 0;
          initProgress();
          updateCardDisplay();
        }, 500);
      }
    });
    
    // Sauvegarder les progrès
    saveBtn.addEventListener('click', saveProgress);
    
    // Clavier: gauche/droite pour naviguer, espace pour retourner
    document.addEventListener('keydown', function(e) {
      if (currentWords.length === 0) return;
      
      if (e.code === 'ArrowLeft' && currentIndex > 0) {
        prevBtn.click();
      } else if (e.code === 'ArrowRight' && currentIndex < currentWords.length - 1) {
        nextBtn.click();
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
    
    // Ajouter des styles pour les nouvelles animations
    const style = document.createElement('style');
    style.textContent = `
      .button-press {
        transform: scale(0.95);
      }
      
      .pulse {
        animation: pulse-animation 0.5s cubic-bezier(0.455, 0.03, 0.515, 0.955);
      }
      
      @keyframes pulse-animation {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      
      .updating {
        opacity: 0.5;
        transform: scale(0.98);
        transition: all 0.15s ease;
      }
      
      .slide-left {
        animation: slide-left-anim 0.2s forwards;
      }
      
      @keyframes slide-left-anim {
        0% { transform: translateX(0); opacity: 1; }
        100% { transform: translateX(-50px); opacity: 0; }
      }
      
      .slide-right {
        animation: slide-right-anim 0.2s forwards;
      }
      
      @keyframes slide-right-anim {
        0% { transform: translateX(0); opacity: 1; }
        100% { transform: translateX(50px); opacity: 0; }
      }
      
      .shuffle-animation {
        animation: shuffle-anim 0.6s ease;
      }
      
      @keyframes shuffle-anim {
        0% { transform: translateY(0) rotate(0); }
        33% { transform: translateY(-15px) rotate(-2deg); }
        66% { transform: translateY(10px) rotate(2deg); }
        100% { transform: translateY(0) rotate(0); }
      }
      
      .mode-change {
        animation: mode-change-anim 0.4s ease;
      }
      
      @keyframes mode-change-anim {
        0% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.95); }
        100% { opacity: 1; transform: scale(1); }
      }
      
      .reset-animation {
        animation: reset-anim 0.5s ease;
      }
      
      @keyframes reset-anim {
        0% { transform: scale(1); }
        50% { transform: scale(0.95); }
        100% { transform: scale(1); }
      }
      
      .saving {
        animation: saving-anim 0.5s ease;
      }
      
      @keyframes saving-anim {
        0% { transform: scale(1); }
        50% { transform: scale(0.95); background-position: right bottom; }
        100% { transform: scale(1); }
      }
      
      .wrong-answer {
        animation: wrong-anim 0.5s ease;
      }
      
      @keyframes wrong-anim {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-5px); }
        40%, 80% { transform: translateX(5px); }
      }
      
      .uncertain-answer {
        animation: uncertain-anim 0.5s ease;
      }
      
      @keyframes uncertain-anim {
        0% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
        100% { transform: translateY(0); }
      }
      
      .correct-answer {
        animation: correct-anim 0.5s ease;
      }
      
      @keyframes correct-anim {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
    
    // Initialisation
    initProgress();
    updateCardDisplay();
    loadProgress(); // Essayer de charger les progrès sauvegardés
    setupCardListeners();
    setupStreakUpdate(); // Start the streak update timer
    
    // Ajouter des écouteurs d'événements pour réinitialiser le minuteur de streak
    // quand l'utilisateur interagit avec la page
    document.querySelectorAll('.knowledge-btn, #next-card, #prev-card, #shuffle-cards').forEach(btn => {
        btn.addEventListener('click', function() {
            setupStreakUpdate();
        });
    });
    
    // Animation d'entrée initiale
    document.querySelectorAll('.stat-card, .flashcard-filters, .mode-selector, .flashcard-container, .progress-container, .flashcard-actions').forEach((element, index) => {
      element.style.opacity = '0';
      element.style.transform = 'translateY(20px)';
      element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      element.style.transitionDelay = `${index * 0.1}s`;
      
      setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }, 100);
    });
    
    // Fix to prevent meaning-to-word mode issues
    setTimeout(() => {
      if (currentWords.length === 0 && allWords.length > 0) {
        console.log('No current words but allWords exists, restoring from allWords');
        currentWords = [...allWords];
        updateCardDisplay();
      }
    }, 1000);
  });
