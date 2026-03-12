/* global showNotification */
document.addEventListener('DOMContentLoaded', function () {
  var streakRecorded = false;
  checkBrowser();

  let allWords = [];
  const wordsContainer = document.getElementById('words-data');
  if (wordsContainer && wordsContainer.dataset.words) {
    try {
      allWords = JSON.parse(wordsContainer.dataset.words);
    } catch (e) {
      console.error('Failed to parse words data:', e);
    }
  }

  let wordsFilteredByLevel = allWords;
  let wordsFilteredByVocab = allWords.filter((word) => word.dueToday);
  let currentWords = [...wordsFilteredByVocab];
  let currentIndex = 0;
  let progress = []; // -1: unseen, 0: à revoir, 2: appris
  let sessionStartTime = new Date();

  let flashcard = document.getElementById('flashcard');
  const currentCardEl = document.getElementById('current-card');
  const totalCardsEl = document.getElementById('total-cards');
  const prevBtn = document.getElementById('prev-card');
  const nextBtn = document.getElementById('next-card');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const shuffleBtn = document.getElementById('shuffle-cards');
  const resetBtn = document.getElementById('reset-progress');
  const sessionTimeEl = document.getElementById('session-time');
  const knownCountEl = document.getElementById('known-count');
  const notKnownCountEl = document.getElementById('not-known-count');
  const uncertainCountEl = document.getElementById('uncertain-count');
  const masteredCountEl = document.getElementById('mastered-count');

  const levelCheckboxes = [
    document.getElementById('levelx'),
    document.getElementById('level0'),
    document.getElementById('level1'),
    document.getElementById('level2'),
  ];
  const modeRadios = document.querySelectorAll('input[name="mode"]');
  const vocabModeRadios = document.querySelectorAll('input[name="vocab-mode"]');

  const animateButtonPress = (button) => {
    button.classList.add('button-press');
    setTimeout(() => button.classList.remove('button-press'), 150);
  };

  document.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('mousedown', function () {
      animateButtonPress(this);
    });
  });

  function initProgress() {
    progress = new Array(currentWords.length).fill(-1);
    updateProgressDisplay();
  }

  function updateProgressDisplay() {
    const toReview = progress.filter((p) => p === 0).length;
    const remaining = progress.filter((p) => p !== 2).length;
    const known = progress.filter((p) => p === 2).length;

    const progressPercent =
      currentWords.length > 0 ? Math.round((known / currentWords.length) * 100) : 0;

    progressBar.style.transition = 'width 0.7s cubic-bezier(0.19, 1, 0.22, 1)';
    progressBar.style.width = `${progressPercent}%`;
    progressText.textContent = `${progressPercent}%`;

    animateCounter(notKnownCountEl, toReview);
    animateCounter(uncertainCountEl, remaining);
    animateCounter(masteredCountEl, known);
    animateCounter(knownCountEl, known);

    renderRemainingWords();
    saveProgress();
  }

  function animateCounter(element, targetValue) {
    const currentValue = parseInt(element.textContent);
    if (isNaN(currentValue) || currentValue === targetValue) {
      element.textContent = targetValue;
      return;
    }

    let startValue = currentValue;
    const duration = 500;
    const startTime = performance.now();

    function tick(timestamp) {
      const elapsed = timestamp - startTime;
      const t = Math.min(elapsed / duration, 1);
      element.textContent = Math.floor(startValue + (targetValue - startValue) * t);
      if (t < 1) requestAnimationFrame(tick);
      else element.textContent = targetValue;
    }

    requestAnimationFrame(tick);
  }

  function updateCardDisplay() {
    if (currentWords.length === 0) {
      console.error('No words available to display');
      flashcard.innerHTML = `
          <div class="flashcard-inner">
            <div class="flashcard-front">
              <h2 class="card-content">Aucun mot disponible</h2>
              <p class="card-prompt">Ajustez vos filtres ou ajoutez plus de mots</p>
            </div>
          </div>`;
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
      let frontContent, backContent;

      if (mode === 'word-to-meaning') {
        frontContent = word.word;
        backContent = word.meaning;
      } else {
        frontContent = word.meaning;
        backContent = word.word;
      }

      if (!frontContent || !backContent) {
        console.error('Missing flashcard content', {
          front: frontContent,
          back: backContent,
          word,
        });
      }

      flashcard.classList.add('updating');
      flashcard.classList.remove('word-to-meaning-mode', 'meaning-to-word-mode');
      flashcard.classList.add(`${mode}-mode`);

      setTimeout(() => {
        flashcard.innerHTML = `
            <div class="flashcard-inner">
              <div class="flashcard-front">
                <span class="card-type">${word.type}</span>
                <span class="card-language">${word.language_code}</span>
                <h2 class="card-content">${frontContent}</h2>
                <div class="hint-container">
                  <button id="hint-button" class="hint-btn"><i class="fas fa-lightbulb"></i> Indice</button>
                  <p id="hint-text" class="hint-text"></p>
                </div>
                <p class="card-prompt">Cliquez pour voir la traduction</p>
              </div>
              <div class="flashcard-back">
                <span class="card-type">${word.type}</span>
                <span class="card-language">${word.language_code}</span>
                <h2 class="card-content">${backContent}</h2>
                <div class="card-details">
                  <p><strong>Exemple:</strong> <span class="example-text">${word.example}</span></p>
                  ${word.synonyms ? `<p><strong>Synonymes:</strong> ${word.synonyms}</p>` : ''}
                  ${word.antonyms ? `<p><strong>Antonymes:</strong> ${word.antonyms}</p>` : ''}
                  ${
                    word.pronunciation
                      ? `
                    <p><strong>Prononciation:</strong> <span class="pronunciation-text">${word.pronunciation}</span></p>
                    <button class="pronunciation-btn" data-text="${word.word}">
                      <i class="fas fa-volume-up"></i> Écouter
                    </button> 
                  `
                      : ''
                  }
                    <button class="pronunciation-btn" data-text="${word.example}">
                      <i class="fas fa-volume-up"></i> Écouter l'exemple
                    </button>
                </div>
              </div>
            </div>`;

        setupCardListeners();
        animateCounter(currentCardEl, currentIndex + 1);
        totalCardsEl.textContent = currentWords.length;
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === currentWords.length - 1;
        flashcard.classList.remove('flipped');
        setTimeout(() => flashcard.classList.remove('updating'), 50);
      }, 150);
    } catch (e) {
      console.error('Card update error:', e);
    }
  }

  function setupCardListeners() {
    const flashcardElement = document.getElementById('flashcard');
    // Replace element to clear old listeners
    const newFlashcard = flashcardElement.cloneNode(true);
    flashcardElement.parentNode.replaceChild(newFlashcard, flashcardElement);

    newFlashcard.addEventListener('click', function () {
      if (currentWords.length > 0) {
        this.classList.toggle('flipped');
      }
    });

    flashcard = newFlashcard;

    const hintBtn = document.getElementById('hint-button');
    const hintText = document.getElementById('hint-text');

    if (hintBtn && hintText) {
      hintBtn.addEventListener('click', function (e) {
        e.stopPropagation();

        const word = currentWords[currentIndex];
        const mode = document.querySelector('input[name="mode"]:checked').value;

        this.classList.add('pulse');
        setTimeout(() => this.classList.remove('pulse'), 500);

        const target = mode === 'word-to-meaning' ? word.meaning : word.word;
        hintText.textContent =
          target.length > 2
            ? `Commence par "${target.charAt(0)}${target.charAt(1)}..." et contient ${target.length} caractères`
            : 'Indice non disponible pour ce mot';

        hintText.style.opacity = '0';
        hintText.style.transform = 'translateY(-10px)';
        hintText.style.display = 'block';

        if (mode === 'meaning-to-word') {
          setTimeout(() => {
            hintText.style.opacity = '0';
            setTimeout(() => (hintText.style.display = 'none'), 500);
          }, 5000);
        }

        setTimeout(() => {
          hintText.style.opacity = '1';
          hintText.style.transform = 'translateY(0)';
        }, 10);
      });
    }

    const pronunciationBtns = document.querySelectorAll('.pronunciation-btn');
    pronunciationBtns.forEach((btn) => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        this.classList.add('pulse');
        setTimeout(() => this.classList.remove('pulse'), 500);
        speakText(this, this.getAttribute('data-text'));
      });
    });
  }

  async function speakText(btn, text) {
    const word = currentWords[currentIndex];
    const oldHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> En cours';

    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: word.language_code }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const audioUrl = URL.createObjectURL(await response.blob());
      const audio = new Audio(audioUrl);
      audio.volume = 0.8;

      const restore = () => {
        URL.revokeObjectURL(audioUrl);
        btn.disabled = false;
        btn.innerHTML = oldHtml;
      };

      audio.onended = restore;
      audio.onerror = () => {
        console.error('Audio playback error');
        restore();
      };

      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      btn.disabled = false;
      btn.innerHTML = oldHtml;
    }
  }

  function filterWords() {
    const selectedLevels = [];
    levelCheckboxes.forEach((cb) => {
      if (cb.checked) selectedLevels.push(cb.value);
    });

    if (selectedLevels.length === 0 && levelCheckboxes.length > 0) {
      levelCheckboxes[0].checked = true;
      selectedLevels.push('x');
    }

    wordsFilteredByLevel = allWords.filter((w) => selectedLevels.includes(w.level));
    const setWords = new Set(wordsFilteredByVocab);
    currentWords = wordsFilteredByLevel.filter((w) => setWords.has(w));

    currentIndex = 0;
    initProgress();
    updateCardDisplay();
  }

  function filterVocab() {
    const vocabMode = document.querySelector('input[name="vocab-mode"]:checked').value;
    wordsFilteredByVocab =
      vocabMode === 'today-words' ? allWords.filter((w) => w.dueToday) : [...allWords];

    const setWords = new Set(wordsFilteredByLevel);
    currentWords = wordsFilteredByVocab.filter((w) => setWords.has(w));

    currentIndex = 0;
    initProgress();
    updateCardDisplay();
  }

  function shuffleWords() {
    for (let i = currentWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [currentWords[i], currentWords[j]] = [currentWords[j], currentWords[i]];
    }
    currentIndex = 0;
    initProgress();

    document.querySelector('.flashcard-container').classList.add('shuffle-animation');
    setTimeout(() => {
      document.querySelector('.flashcard-container').classList.remove('shuffle-animation');
      updateCardDisplay();
    }, 600);
  }

  function updateSessionTimer() {
    const elapsed = Math.floor((new Date() - sessionStartTime) / 1000);
    const mm = Math.floor(elapsed / 60)
      .toString()
      .padStart(2, '0');
    const ss = (elapsed % 60).toString().padStart(2, '0');
    sessionTimeEl.textContent = `${mm}:${ss}`;
  }

  function saveProgress() {
    try {
      localStorage.setItem(
        'flashcards_progress',
        JSON.stringify({
          date: new Date().toISOString(),
          progress,
          words: currentWords.map((w) => w.id),
        })
      );
    } catch (e) {
      console.error('Save progress error:', e);
    }
  }

  function loadProgress() {
    try {
      const saved = localStorage.getItem('flashcards_progress');
      if (!saved) return;
      const data = JSON.parse(saved);
      const currentIds = currentWords.map((w) => w.id);

      if (
        data.words.length === currentIds.length &&
        data.words.every((id) => currentIds.includes(id))
      ) {
        progress = data.progress;
        updateProgressDisplay();
      }
    } catch (e) {
      console.error('Load progress error:', e);
    }
  }

  function checkBrowser() {
    const ua = navigator.userAgent.toLowerCase();
    const isChrome = ua.includes('chrome') && !ua.includes('edg');
    const isSafari = ua.includes('safari') && !ua.includes('chrome');
    const isEdge = ua.includes('edg');
    if (!isChrome && !isSafari && !isEdge) showInstructions();
  }

  function showInstructions() {
    const appBaseUrl =
      (typeof window !== 'undefined' && window.APP_BASE_URL) || 'https://www.sealvo.it.com';
    let siteLabel = 'sealvo.it.com';
    try {
      siteLabel = new URL(appBaseUrl).hostname;
    } catch {
      /* keep default */
    }

    const modal = document.createElement('div');
    modal.className = 'browser-modal';
    modal.innerHTML = `
             <div class="browser-content">
                 <div class="modal-header">
                     <div class="warning-icon">
                         <i class="fas fa-exclamation-triangle"></i>
                     </div>
                     <h2>Oops ! Navigateur non optimal</h2>
                     <p class="subtitle">Passons à quelque chose de mieux ✨</p>
                 </div>
                 
                 <div class="modal-body">
                     <div class="recommended-browsers">
                         <div class="browser-option chrome">
                             <div class="browser-icon"><i class="fab fa-chrome"></i></div>
                             <span>Chrome</span>
                         </div>
                         <div class="browser-option edge">
                             <div class="browser-icon"><i class="fab fa-edge"></i></div>
                             <span>Edge</span>
                         </div>
                         <div class="browser-option safari">
                             <div class="browser-icon"><i class="fab fa-safari"></i></div>
                             <span>Safari</span>
                         </div>
                     </div>
                     
                    <div class="site-info">
                        <div class="site-badge">
                            <i class="fas fa-globe"></i>
                            <span class="site-badge-host">${siteLabel}</span>
                            <button class="copy-btn" title="Copier l'URL">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="change-browser-btn primary-btn">
                        <i class="fas fa-external-link-alt"></i>
                        <span>Ouvrir dans Edge</span>
                        <div class="btn-glow"></div>
                    </button>
                    <button class="continue-anyway-btn secondary-btn">
                        <i class="fas fa-play"></i>
                        Continuer quand même
                    </button>
                </div>
            </div>`;
    document.body.appendChild(modal);

    const changeBrowserBtn = modal.querySelector('.change-browser-btn');
    const continueBtn = modal.querySelector('.continue-anyway-btn');
    const copyBtn = modal.querySelector('.copy-btn');

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(appBaseUrl).then(() => {
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        copyBtn.style.background = '#10b981';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
          copyBtn.style.background = '';
        }, 2000);
      });
    });

    changeBrowserBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = `microsoft-edge:${appBaseUrl}`;
      link.click();
    });

    continueBtn.addEventListener('click', () => {
      modal.classList.add('modal-exit');
      setTimeout(() => modal.remove(), 300);
    });
  }

  // Navigation
  prevBtn.addEventListener('click', function () {
    if (currentIndex > 0) {
      flashcard.classList.add('slide-right');
      setTimeout(() => {
        currentIndex--;
        updateCardDisplay();
        flashcard.classList.remove('slide-right');
      }, 200);
    }
  });

  nextBtn.addEventListener('click', function () {
    if (currentIndex < currentWords.length - 1) {
      flashcard.classList.add('slide-left');
      setTimeout(() => {
        currentIndex++;
        updateCardDisplay();
        flashcard.classList.remove('slide-left');
      }, 200);
    }
  });

  // Knowledge level buttons
  document.querySelectorAll('.knowledge-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const level = parseInt(this.getAttribute('data-level'));
      progress[currentIndex] = level;
      updateProgressDisplay();

      if (
        !streakRecorded &&
        currentWords.length > 0 &&
        progress.every(function (p) {
          return p === 2;
        })
      ) {
        streakRecorded = true;
        recordStreak();
      }

      const animationClass = level === 0 ? 'wrong-answer' : 'correct-answer';

      flashcard.classList.add(animationClass);
      setTimeout(() => {
        flashcard.classList.remove(animationClass);
        if (currentIndex < currentWords.length - 1) {
          flashcard.classList.add('slide-left');
          setTimeout(() => {
            currentIndex++;
            updateCardDisplay();
            flashcard.classList.remove('slide-left');
          }, 200);
        }
      }, 500);
    });
  });

  levelCheckboxes.forEach((cb) => cb.addEventListener('change', filterWords));
  vocabModeRadios.forEach((r) => r.addEventListener('change', filterVocab));

  modeRadios.forEach((radio) => {
    radio.addEventListener('change', function () {
      document.querySelector('.flashcard-container').classList.add('mode-change');
      setTimeout(() => {
        document.querySelector('.flashcard-container').classList.remove('mode-change');
        updateCardDisplay();
      }, 400);
    });
  });

  shuffleBtn.addEventListener('click', shuffleWords);

  resetBtn.addEventListener('click', function () {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser votre progression ?')) {
      document.querySelector('.progress-container').classList.add('reset-animation');
      setTimeout(() => {
        document.querySelector('.progress-container').classList.remove('reset-animation');
        currentIndex = 0;
        initProgress();
        updateCardDisplay();
      }, 500);
    }
  });

  // Keyboard shortcuts: arrows to navigate, space to flip, 1/2 for knowledge level
  document.addEventListener('keydown', function (e) {
    if (currentWords.length === 0) return;

    if (e.code === 'ArrowLeft' && currentIndex > 0) {
      prevBtn.click();
    } else if (e.code === 'ArrowRight' && currentIndex < currentWords.length - 1) {
      nextBtn.click();
    } else if (e.code === 'Space') {
      flashcard.classList.toggle('flipped');
      e.preventDefault();
    } else if (e.code === 'Digit1' || e.code === 'Numpad1') {
      document.querySelector('.knowledge-btn[data-level="0"]').click();
    } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
      document.querySelector('.knowledge-btn[data-level="2"]').click();
    }
  });

  setInterval(updateSessionTimer, 1000);

  window.addEventListener('beforeunload', function (e) {
    if (progress.some((p) => p !== -1)) {
      e.preventDefault();
      e.returnValue = 'Vous avez des progrès non sauvegardés. Êtes-vous sûr de vouloir quitter ?';
    }
  });

  function renderRemainingWords() {
    var container = document.getElementById('remaining-words');
    if (!container) return;

    var items = [];
    for (var i = 0; i < currentWords.length; i++) {
      if (progress[i] === 0) {
        items.push({ index: i, word: currentWords[i].word });
      }
    }

    if (items.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML =
      '<h4>À revoir (' +
      items.length +
      ')</h4><div class="word-chips">' +
      items
        .map(function (item) {
          return (
            '<span class="word-chip chip-review" data-jump="' +
            item.index +
            '">' +
            item.word +
            '</span>'
          );
        })
        .join('') +
      '</div>';

    container.querySelectorAll('.word-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        currentIndex = parseInt(this.getAttribute('data-jump'));
        updateCardDisplay();
      });
    });
  }

  function recordStreak() {
    var known = progress.filter(function (p) {
      return p === 2;
    }).length;
    var total = currentWords.length;
    var summary = known + '/' + total + ' mots maîtrisés';

    fetch('/update-streak', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.updated) {
          showNotification(
            '🔥 Série de ' + data.newStreak + ' jour(s) !\n' + summary,
            'success',
            6000
          );
        } else {
          showNotification('Session terminée ! ' + summary, 'success', 5000);
        }
      })
      .catch(function () {
        showNotification('Session terminée ! ' + summary, 'success', 5000);
      });
  }

  initProgress();
  updateCardDisplay();
  loadProgress();
  setupCardListeners();

  // Staggered entrance animation
  document
    .querySelectorAll(
      '.stat-card, .flashcard-filters, .mode-selector, .flashcard-container, .progress-container, .flashcard-actions'
    )
    .forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      el.style.transitionDelay = `${i * 0.1}s`;
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 100);
    });
});
