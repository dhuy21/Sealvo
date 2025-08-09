document.addEventListener('DOMContentLoaded', function() {

    // Variables du jeu
    let currentWord = null;
    let words = [];
    let currentIndex = 0;
    let attemptCount = 0;
    let gameActive = false;
    let timerInterval = null;
    let startTime = null;
    let completedWords = 0;
    let totalAccuracy = 0;
    let perfectPronunciations = 0;
    let wordsList = [];
    
    // Variables pour la reconnaissance vocale (Web Speech API) - Améliorées
    let recognition = null;
    let isListening = false;
    let speechSupported = false;
    let userGestureReceived = false; // Pour Safari iOS
    let microphonePermissionGranted = false; // Pour Safari iOS
    let recognitionRetryCount = 0;
    let maxRetries = 3;
    let recognitionTimeout = null;
    let isRecognitionInitialized = false;
    let currentLanguage = 'en-US';
    
    // Variables pour les animations sonores
    let soundWavesContainer = null;
    let audioVisualizerContainer = null;
    let floatingSoundIconsContainer = null;
    let recordingWavesContainer = null;
    
    // Éléments DOM
    const startGameBtn = document.getElementById('start-game');
    const playWordBtn = document.getElementById('playWord');
    const recordBtn = document.getElementById('recordBtn');
    const skipWordBtn = document.getElementById('skipWord');
    const playAgainBtn = document.getElementById('play-again');
    
    const currentWordDisplay = document.getElementById('currentWord');
    const phoneticSpellingDisplay = document.getElementById('phoneticSpelling');
    const wordsCountDisplay = document.getElementById('words-count');
    const timerDisplay = document.getElementById('timer');
    const accuracyValueDisplay = document.getElementById('accuracy-value');
    const accuracyMeter = document.getElementById('accuracyMeter');
    const recognizedText = document.getElementById('recognizedText');
    const feedbackText = document.getElementById('feedbackText');
    const wordListContainer = document.getElementById('wordList');
    const loader = document.getElementById('loader');
    const finalScoreDisplay = document.getElementById('final-score');
    const finalTimeDisplay = document.getElementById('final-time');
    const finalAccuracyDisplay = document.getElementById('final-accuracy');
    const perfectCountDisplay = document.getElementById('perfect-count');
    const highScoreMessage = document.getElementById('high-score-message');
    const packageId = document.getElementById('package-id').getAttribute('data-package');
    const trackLevelMessage = document.getElementById('track-level-message');
    
    // Écrans de jeu
    const preGameScreen = document.querySelector('.pre-game-screen');
    const activeGameScreen = document.querySelector('.active-game-screen');
    const postGameScreen = document.querySelector('.post-game-screen');

    // Initialize sound wave animations
    initializeSoundWaveAnimations();
    
    // Initialiser la gestion des gestes utilisateur pour Safari iOS
    initializeUserGestureHandling();
    
    // Fonction pour initialiser les animations de vagues sonores
    function initializeSoundWaveAnimations() {
        createSoundWaves();
        createAudioVisualizer();
        createRecordingWaves();
    }
    
    // Fonction pour initialiser la gestion des gestes utilisateur (Safari iOS)
    function initializeUserGestureHandling() {
        // Détecter les gestes utilisateur pour Safari iOS
        const userGestureEvents = ['touchstart', 'touchend', 'mousedown', 'keydown', 'click'];
        
        function handleUserGesture() {
            userGestureReceived = true;
            console.log('Geste utilisateur détecté pour Safari iOS');
            
            // Retirer les écouteurs après le premier geste
            userGestureEvents.forEach(event => {
                document.removeEventListener(event, handleUserGesture, true);
            });
        }
        
        // Ajouter les écouteurs de gestes
        userGestureEvents.forEach(event => {
            document.addEventListener(event, handleUserGesture, true);
        });
        
        // Pour Safari iOS, demander les permissions microphone dès que possible
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            // Ajouter un message d'information pour iOS
            setTimeout(() => {
                if (feedbackText && !gameActive) {
                    feedbackText.textContent = 'Appuyez sur l\'écran pour activer le microphone.';
                }
            }, 1000);
        }
    }
    
    // Function to set feedback text color based on theme
    function setFeedbackTextColor(type) {
        if (!feedbackText) return;
        
        // Remove all existing color classes
        feedbackText.classList.remove('feedback-success', 'feedback-info', 'feedback-warning', 'feedback-error', 'feedback-neutral');
        
        // Add appropriate class based on type
        switch (type) {
            case 'success':
                feedbackText.classList.add('feedback-success');
                break;
            case 'info':
                feedbackText.classList.add('feedback-info');
                break;
            case 'warning':
                feedbackText.classList.add('feedback-warning');
                break;
            case 'error':
                feedbackText.classList.add('feedback-error');
                break;
            case 'neutral':
            default:
                feedbackText.classList.add('feedback-neutral');
                break;
        }
    }
    
    // Fonction pour vérifier et demander les permissions microphone (Safari iOS)
    async function checkMicrophonePermissions() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('getUserMedia non supporté');
            return false;
        }
        
        try {
            // Demander l'accès au microphone pour vérifier les permissions
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Fermer immédiatement le stream
            stream.getTracks().forEach(track => track.stop());
            
            microphonePermissionGranted = true;
            return true;
        } catch (error) {
            console.error('Permission microphone refusée:', error);
            microphonePermissionGranted = false;
            
            if (feedbackText) {
                feedbackText.textContent = 'Permission microphone requise. Activez-la dans les paramètres.';
                setFeedbackTextColor('error');
            }
            
            return false;
        }
    }
    
    // Fonction pour créer les vagues sonores de fond
    function createSoundWaves() {
        soundWavesContainer = document.createElement('div');
        soundWavesContainer.className = 'sound-waves';
        document.body.appendChild(soundWavesContainer);
        
        // Créer 12 vagues sonores (beaucoup plus)
        for (let i = 1; i <= 12; i++) {
            const soundWave = document.createElement('div');
            soundWave.className = 'sound-wave';
            soundWavesContainer.appendChild(soundWave);
        }
    }
    
    // Fonction pour créer le visualiseur audio
    function createAudioVisualizer() {
        audioVisualizerContainer = document.createElement('div');
        audioVisualizerContainer.className = 'audio-visualizer';
        document.body.appendChild(audioVisualizerContainer);
        
        // Créer 25 barres de visualisation (beaucoup plus)
        for (let i = 1; i <= 25; i++) {
            const visualizerBar = document.createElement('div');
            visualizerBar.className = 'visualizer-bar';
            audioVisualizerContainer.appendChild(visualizerBar);
        }
    }

    // Fonction pour créer les vagues d'enregistrement
    function createRecordingWaves() {
        recordingWavesContainer = document.createElement('div');
        recordingWavesContainer.className = 'recording-waves';
        document.body.appendChild(recordingWavesContainer);
        
        // Créer 6 anneaux d'enregistrement (plus d'anneaux)
        for (let i = 1; i <= 3; i++) {
            const recordingRing = document.createElement('div');
            recordingRing.className = 'recording-ring';
            recordingWavesContainer.appendChild(recordingRing);
        }
    }
    
    // Fonction pour activer les vagues d'enregistrement
    function activateRecordingWaves() {
        if (recordingWavesContainer) {
            recordingWavesContainer.classList.add('active');
        }
    }
    
    // Fonction pour désactiver les vagues d'enregistrement
    function deactivateRecordingWaves() {
        if (recordingWavesContainer) {
            recordingWavesContainer.classList.remove('active');
        }
    }
    
    // Fonction pour activer l'effet de parole sur l'affichage du mot
    function activateSpeakingEffect() {
        if (currentWordDisplay) {
            currentWordDisplay.parentElement.classList.add('speaking');
            setTimeout(() => {
                if (currentWordDisplay) {
                    currentWordDisplay.parentElement.classList.remove('speaking');
                }
            }, 2000); // Durée de l'effet de parole
        }
    }
    
    // Fonction pour intensifier les animations pendant l'enregistrement
    function intensifyAudioAnimations() {
        if (audioVisualizerContainer) {
            audioVisualizerContainer.style.opacity = '0.6';
            const bars = audioVisualizerContainer.querySelectorAll('.visualizer-bar');
            bars.forEach(bar => {
                bar.style.animationDuration = '0.8s';
            });
        }
        
        if (soundWavesContainer) {
            const waves = soundWavesContainer.querySelectorAll('.sound-wave');
            waves.forEach(wave => {
                wave.style.animationDuration = '2s';
                wave.style.borderColor = 'rgba(229, 62, 62, 0.2)';
            });
        }
    }
    
    // Fonction pour normaliser les animations
    function normalizeAudioAnimations() {
        if (audioVisualizerContainer) {
            audioVisualizerContainer.style.opacity = '0.3';
            const bars = audioVisualizerContainer.querySelectorAll('.visualizer-bar');
            bars.forEach(bar => {
                bar.style.animationDuration = '1.5s';
            });
        }
        
        if (soundWavesContainer) {
            const waves = soundWavesContainer.querySelectorAll('.sound-wave');
            waves.forEach((wave, index) => {
                wave.style.animationDuration = '3s';
                // Restaurer les couleurs originales
                const colors = [
                    'rgba(106, 17, 203, 0.15)',
                    'rgba(37, 117, 252, 0.12)',
                    'rgba(139, 92, 246, 0.1)',
                    'rgba(106, 17, 203, 0.08)',
                    'rgba(37, 117, 252, 0.1)'
                ];
                wave.style.borderColor = colors[index] || 'rgba(106, 17, 203, 0.1)';
            });
        }
    }
    
    // Fonctions utilitaires
    function formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    
    function updateTimer() {
        if (!startTime) return;
        const elapsedTime = Date.now() - startTime;
        if (timerDisplay) timerDisplay.textContent = formatTime(elapsedTime);
    }
    
    // Fonction pour démarrer le jeu
    function startGame() {
        
        // Réinitialiser les variables
        currentWord = null;

        gameActive = true;
        startTime = Date.now();
        completedWords = 0;
        totalAccuracy = 0;
        perfectPronunciations = 0;
        wordsList = [];
        
        // Mettre à jour l'affichage
        if (wordsCountDisplay) wordsCountDisplay.textContent = completedWords;
        if (timerDisplay) timerDisplay.textContent = '00:00';
        if (accuracyValueDisplay) accuracyValueDisplay.textContent = '0%';
        
        currentWordDisplay.textContent = '';
        phoneticSpellingDisplay.textContent = '';
        loader.removeAttribute('style');
        // Désactiver le bouton d'écoute au début
        if (playWordBtn) {
            playWordBtn.disabled = true;
            playWordBtn.classList.add('disabled');
        }

        
        // Démarrer le timer
        timerInterval = setInterval(updateTimer, 1000);
        
        
        // Message spécifique pour Safari iOS
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            if (feedbackText) {
                feedbackText.textContent = 'Jeu démarré. Appuyez sur le microphone pour commencer l\'enregistrement.';
                setFeedbackTextColor('info');
            }
        }
        
        // Charger le premier mot
        setTimeout(loadNewWord, 7000);

        
        
        // Afficher l'écran de jeu actif
        console.log('Switching to active game screen...');
        if (preGameScreen) {
            preGameScreen.classList.remove('active');
        }
        if (activeGameScreen) {
            activeGameScreen.classList.add('active');
        }
        if (postGameScreen) {
            postGameScreen.classList.remove('active');
        }
    }
    
    // Fonction pour configurer la reconnaissance vocale (Web Speech API) - Améliorée
    function setupSpeechRecognition() {
        // Éviter la recréation multiple de l'instance
        if (isRecognitionInitialized && recognition) {
            console.log('Reconnaissance vocale déjà initialisée');
            return;
        }
        
        // Vérifier la compatibilité du navigateur
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('Web Speech API non supportée par ce navigateur');
            speechSupported = false;
            if (recordBtn) {
                recordBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Non supporté';
                recordBtn.disabled = true;
            }
            return;
        }

        speechSupported = true;
        
        // Nettoyer l'ancienne instance si elle existe
        if (recognition) {
            try {
                recognition.abort();
            } catch (e) {
                console.log('Nettoyage de l\'ancienne instance');
            }
        }
        
        // Créer l'instance de reconnaissance vocale (Safari nécessite webkitSpeechRecognition)
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        // Configuration optimisée pour tous les navigateurs
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = currentLanguage;
        recognition.maxAlternatives = 1;
        
        // Configuration spécifique pour Safari iOS
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            console.log('Configuration pour Safari iOS détectée');
            recognition.continuous = false; // Obligatoire sur iOS
            recognition.interimResults = false; // Obligatoire sur iOS
            recognition.maxAlternatives = 1; // Limiter pour iOS
            recognition.grammars = undefined; // Pas supporté sur iOS
        }
        
        // Configuration pour Chrome/Edge
        if (/Chrome|Edge/.test(navigator.userAgent)) {
            console.log('Configuration pour Chrome/Edge détectée');
            recognition.continuous = false;
            recognition.interimResults = false;
        }
        
        // Configuration pour Firefox
        if (/Firefox/.test(navigator.userAgent)) {
            console.log('Configuration pour Firefox détectée');
            recognition.continuous = false;
            recognition.interimResults = false;
        }
        
        // Événements de la reconnaissance vocale - Améliorés
        recognition.onstart = () => {
            console.log('Reconnaissance vocale démarrée');
            isListening = true;
            recognitionRetryCount = 0; // Réinitialiser le compteur de tentatives
            
            if (recordBtn) {
                recordBtn.classList.add('recording');
                recordBtn.innerHTML = '<i class="fas fa-stop"></i> Arrêter';
                recordBtn.disabled = false;
            }
            
            // Activer les effets visuels d'enregistrement
            activateRecordingWaves();
            intensifyAudioAnimations();
            
            // Feedback visuel amélioré
            if (feedbackText) {
                feedbackText.textContent = 'Écoute en cours... Parlez maintenant.';
                setFeedbackTextColor('info');
            }
            
            // Timeout de sécurité adaptatif selon le navigateur
            const optimizations = getBrowserOptimizations();
            recognitionTimeout = setTimeout(() => {
                if (isListening) {
                    console.log('Timeout de reconnaissance - arrêt automatique');
                    stopListening();
                }
            }, optimizations.timeout);
        };
        
        recognition.onresult = (event) => {
            // Nettoyer le timeout
            if (recognitionTimeout) {
                clearTimeout(recognitionTimeout);
                recognitionTimeout = null;
            }
            
            if (event.results && event.results.length > 0) {
                const results = event.results[0];
                if (results && results.length > 0) {
                    const spokenText = results[0].transcript.toLowerCase().trim();
                    const confidence = results[0].confidence || 0.5; // Fallback pour Safari
                    
                    console.log('Texte reconnu:', spokenText, 'Confiance:', confidence);
                    
                    // Traiter le résultat
                    processSpeechResult(spokenText, confidence);
                } else {
                    console.warn('Aucun résultat de reconnaissance disponible');
                    if (feedbackText) {
                        feedbackText.textContent = 'Aucun son détecté. Essayez de parler plus fort.';
                        setFeedbackTextColor('warning');
                    }
                }
            }
        };
        
        recognition.onerror = (event) => {
            // Nettoyer le timeout
            if (recognitionTimeout) {
                clearTimeout(recognitionTimeout);
                recognitionTimeout = null;
            }
            
            console.error('Erreur de reconnaissance vocale:', event.error);
            isListening = false;
            
            if (recordBtn) {
                recordBtn.classList.remove('recording');
                recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Enregistrer';
                recordBtn.disabled = false;
            }
            
            // Désactiver les effets visuels d'enregistrement
            deactivateRecordingWaves();
            normalizeAudioAnimations();
            
            // Gestion d'erreur améliorée avec retry automatique
            let errorMessage = 'Erreur de reconnaissance vocale';
            let shouldRetry = false;
            
            switch (event.error) {
                case 'no-speech':
                    errorMessage = 'Aucune parole détectée. Parlez plus fort et plus clairement.';
                    shouldRetry = recognitionRetryCount < maxRetries;
                    break;
                case 'audio-capture':
                    errorMessage = 'Impossible d\'accéder au microphone. Vérifiez les permissions.';
                    shouldRetry = false;
                    break;
                case 'not-allowed':
                    errorMessage = 'Permission microphone refusée. Activez le microphone dans les paramètres.';
                    shouldRetry = false;
                    break;
                case 'network':
                    errorMessage = 'Erreur réseau. Vérifiez votre connexion internet.';
                    shouldRetry = recognitionRetryCount < maxRetries;
                    break;
                case 'aborted':
                    errorMessage = 'Reconnaissance interrompue. Essayez à nouveau.';
                    shouldRetry = recognitionRetryCount < maxRetries;
                    break;
                case 'service-not-allowed':
                    errorMessage = 'Service de reconnaissance non autorisé. Essayez de recharger la page.';
                    shouldRetry = false;
                    break;
                default:
                    errorMessage = `Erreur: ${event.error}. Essayez de recharger la page.`;
                    shouldRetry = recognitionRetryCount < maxRetries;
            }
            
            if (feedbackText) {
                feedbackText.textContent = errorMessage;
                setFeedbackTextColor('error');
            }
            
            // Retry automatique pour certaines erreurs
            if (shouldRetry && recognitionRetryCount < maxRetries) {
                recognitionRetryCount++;
                console.log(`Tentative ${recognitionRetryCount}/${maxRetries}`);
                
                setTimeout(() => {
                    if (feedbackText) {
                        feedbackText.textContent = `Nouvelle tentative (${recognitionRetryCount}/${maxRetries})...`;
                        setFeedbackTextColor('info');
                    }
                    startListening();
                }, 1000);
            } else {
                recognitionRetryCount = 0; // Réinitialiser pour la prochaine fois
                
                // Si trop d'erreurs consécutives, réinitialiser complètement
                if (recognitionRetryCount >= maxRetries * 2) {
                    handleCompleteSpeechFailure();
                } else {
                    // Pour Safari iOS, suggérer de réessayer après une erreur
                    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                        setTimeout(() => {
                            if (feedbackText && feedbackText.textContent === errorMessage) {
                                feedbackText.textContent = 'Appuyez sur le bouton microphone pour réessayer.';
                                setFeedbackTextColor('neutral');
                        }
                    }, 3000);
                }
            }
            }
        };
        
        recognition.onend = () => {
            // Nettoyer le timeout
            if (recognitionTimeout) {
                clearTimeout(recognitionTimeout);
                recognitionTimeout = null;
            }
            
            console.log('Reconnaissance vocale terminée');
            isListening = false;
            
            if (recordBtn) {
                recordBtn.classList.remove('recording');
                recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Enregistrer';
                recordBtn.disabled = false;
            }
            
            // Désactiver les effets visuels d'enregistrement
            deactivateRecordingWaves();
            normalizeAudioAnimations();
            
            // Message de fin amélioré
            if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                setTimeout(() => {
                    if (feedbackText && !feedbackText.textContent.includes('Vous avez dit')) {
                        feedbackText.textContent = 'Reconnaissance terminée. Appuyez sur le microphone pour réessayer.';
                        setFeedbackTextColor('neutral');
                    }
                }, 1000);
            }
        };
        
        // Marquer comme initialisée
        isRecognitionInitialized = true;
        console.log('Reconnaissance vocale configurée avec succès');
    }
    
    // Fonction pour réinitialiser la reconnaissance vocale (nouvelle)
    function resetSpeechRecognition() {
        console.log('Réinitialisation de la reconnaissance vocale');
        
        // Arrêter l'enregistrement en cours
        if (isListening) {
            stopListening();
        }
        
        // Nettoyer les timeouts
        if (recognitionTimeout) {
            clearTimeout(recognitionTimeout);
            recognitionTimeout = null;
        }
        
        // Réinitialiser les variables
        isRecognitionInitialized = false;
        recognitionRetryCount = 0;
        isListening = false;
        
        // Recréer l'instance de reconnaissance
        setupSpeechRecognition();
    }
    
    // Fonction pour optimiser selon le navigateur (nouvelle)
    function getBrowserOptimizations() {
        const userAgent = navigator.userAgent;
        const optimizations = {
            delay: 100,
            maxRetries: 3,
            timeout: 10000
        };
        
        if (/iPad|iPhone|iPod/.test(userAgent)) {
            optimizations.delay = 300;
            optimizations.maxRetries = 2;
            optimizations.timeout = 8000;
        } else if (/Chrome|Edge/.test(userAgent)) {
            optimizations.delay = 50;
            optimizations.maxRetries = 3;
            optimizations.timeout = 12000;
        } else if (/Firefox/.test(userAgent)) {
            optimizations.delay = 150;
            optimizations.maxRetries = 2;
            optimizations.timeout = 10000;
        }
        
        return optimizations;
    }
    
    // Fonction pour gérer l'échec complet de la reconnaissance vocale (nouvelle)
    function handleCompleteSpeechFailure() {
        console.log('Échec complet de la reconnaissance vocale - réinitialisation');
        
        if (feedbackText) {
            feedbackText.textContent = 'Problème avec le microphone. Réinitialisation...';
            setFeedbackTextColor('warning');
        }
        
        // Réinitialiser complètement la reconnaissance
        setTimeout(() => {
            resetSpeechRecognition();
            
            if (feedbackText) {
                feedbackText.textContent = 'Microphone réinitialisé. Essayez à nouveau.';
                setFeedbackTextColor('info');
            }
        }, 2000);
    }
    
    // Fonction pour jouer l'audio du mot (nouvelle)
    function playWordAudio(word) {
        console.log('Lecture audio pour le mot:', word.word);
        
        // Activer l'effet de parole pendant la lecture audio
        activateSpeakingEffect();
        
        // Essayer d'abord l'audio enregistré si disponible
        if (word.audio) {
            try {
                const audio = new Audio(word.audio);
                audio.play().catch(error => {
                    console.log('Erreur avec l\'audio enregistré, utilisation de la synthèse vocale:', error);
                    useTextToSpeech(word);
                });
            } catch (error) {
                console.log('Erreur avec l\'audio enregistré, utilisation de la synthèse vocale:', error);
                useTextToSpeech(word);
            }
        } else {
            // Utiliser la synthèse vocale (Text-to-Speech)
            useTextToSpeech(word);
        }
    }
    
    // Fonction pour utiliser la synthèse vocale (nouvelle)
    function useTextToSpeech(word) {
        if ('speechSynthesis' in window) {
            // Arrêter toute synthèse vocale en cours
            speechSynthesis.cancel();
            
            // Créer un nouvel énoncé
            const utterance = new SpeechSynthesisUtterance(word.word);
            
            // Configurer la langue selon le code de langue du mot
            if (word.language_code) {
                utterance.lang = word.language_code;
            } else {
                // Fallback vers l'anglais si pas de langue spécifiée
                utterance.lang = 'en-US';
            }
            
            // Configurer la vitesse et le pitch
            utterance.rate = 0.8; // Vitesse légèrement plus lente
            utterance.pitch = 1.0; // Pitch normal
            utterance.volume = 1.0; // Volume maximum
            
            // Événements pour le feedback
            utterance.onstart = () => {
                console.log('Synthèse vocale démarrée');
                if (feedbackText) {
                    feedbackText.textContent = 'Lecture en cours...';
                    setFeedbackTextColor('info');
                }
            };
            
            utterance.onend = () => {
                console.log('Synthèse vocale terminée');
                if (feedbackText) {
                    feedbackText.textContent = '';
                    setFeedbackTextColor('neutral');
                }
            };
            
            utterance.onerror = (event) => {
                console.error('Erreur de synthèse vocale:', event.error);
                if (feedbackText) {
                    feedbackText.textContent = 'Erreur de lecture audio.';
                    setFeedbackTextColor('error');
                }
            };
            
            // Démarrer la synthèse vocale
            speechSynthesis.speak(utterance);
            
        } else {
            console.error('Synthèse vocale non supportée par ce navigateur');
            if (feedbackText) {
                feedbackText.textContent = 'Lecture audio non supportée sur ce navigateur.';
                setFeedbackTextColor('error');
            }
        }
    }
    
    // Fonction pour charger un nouveau mot
    function loadNewWord() {
        if (attemptCount > 5) {
            console.log("Vocabulaire limité, acceptation du même mot après 5 tentatives");
            attemptCount = 0;
        }
        
        fetch(`/games/testPronun/words?package=${packageId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error(data.error);
                alert('Une erreur est survenue lors du chargement du mot.');
                return;
            }

            words = data.words;

            
            // Réinitialiser le compteur de tentatives
            attemptCount = 0;
            const randomIndex = Math.floor(Math.random() * words.length);
            currentIndex = randomIndex;
            
            // Mettre à jour le mot courant
            currentWord = words[currentIndex];
            
            // Afficher le mot et sa prononciation phonétique
            loader.setAttribute('style', 'display: none;');
            if (currentWordDisplay) currentWordDisplay.textContent = currentWord.word;
            if (phoneticSpellingDisplay) phoneticSpellingDisplay.textContent = currentWord.pronunciation ;
            
            // Activer le bouton d'écoute
            if (playWordBtn) {
                playWordBtn.disabled = false;
                playWordBtn.classList.remove('disabled');
            }
            
            // Réinitialiser l'affichage de feedback
            if (accuracyMeter) {
                const meterFill = accuracyMeter.querySelector('.meter-fill');
                if (meterFill) meterFill.style.width = '0%';
            }
            if (recognizedText) recognizedText.textContent = '';
            if (feedbackText) feedbackText.textContent = '';
            
            // Animation d'apparition du mot
            if (currentWordDisplay) {
                currentWordDisplay.classList.add('fadeIn');
                setTimeout(() => {
                    currentWordDisplay.classList.remove('fadeIn');
                }, 500);
            }
            
            // Configurer la reconnaissance vocale
            setupSpeechRecognition();
            
            // Mettre à jour la langue si nécessaire
            if (currentWord.language_code) {
                currentLanguage = currentWord.language_code;
                if (recognition) {
                    recognition.lang = currentLanguage;
                    console.log('Langue mise à jour pour le nouveau mot:', currentLanguage);
                }
            }
        })
        .catch(error => {
            console.error('Erreur lors du chargement du mot:', error);
            alert('Une erreur est survenue lors du chargement du mot.');
        });
    }
    
    // Fonction pour démarrer la reconnaissance vocale (améliorée avec retry et gestion d'erreur)
    function startListening() {
        if (!recognition || !speechSupported) {
            console.error('Reconnaissance vocale non disponible');
            if (feedbackText) {
                feedbackText.textContent = 'Reconnaissance vocale non supportée sur ce navigateur.';
                setFeedbackTextColor('error');
            }
            return;
        }
        
        if (isListening) {
            stopListening();
            return;
        }
        
        // Vérifications spéciales pour Safari iOS
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            // Vérifier qu'un geste utilisateur a été reçu
            if (!userGestureReceived) {
                if (feedbackText) {
                    feedbackText.textContent = 'Appuyez sur l\'écran puis sur le microphone.';
                    setFeedbackTextColor('warning');
                }
                return;
            }
            
            // Vérifier les permissions microphone pour iOS
            if (!microphonePermissionGranted) {
                checkMicrophonePermissions().then(granted => {
                    if (granted) {
                        // Réessayer après avoir obtenu les permissions
                        setTimeout(() => startListening(), 500);
                    }
                });
                return;
            }
            
            // S'assurer que l'action est déclenchée par un geste utilisateur
            if (!document.hasFocus()) {
                if (feedbackText) {
                    feedbackText.textContent = 'Appuyez sur l\'écran puis sur le microphone.';
                    setFeedbackTextColor('warning');
                }
                return;
            }
        }
        
        try {
            // Réinitialiser les messages précédents
            if (recognizedText) recognizedText.textContent = '';
            if (feedbackText) {
                feedbackText.textContent = 'Préparation de l\'enregistrement...';
                setFeedbackTextColor('info');
            }
            
            // Mettre à jour la langue si nécessaire
            if (currentWord && currentWord.language_code && recognition.lang !== currentWord.language_code) {
                currentLanguage = currentWord.language_code;
                recognition.lang = currentLanguage;
                console.log('Langue mise à jour:', currentLanguage);
            }
            
            // Démarrer la reconnaissance avec gestion d'erreur améliorée
            const startRecognition = () => {
                try {
                    recognition.start();
                    console.log('Démarrage de la reconnaissance vocale');
                } catch (error) {
                    console.error('Erreur lors du démarrage de la reconnaissance:', error);
                    handleRecognitionError(error);
                }
            };
            
            // Optimisations selon le navigateur
            const optimizations = getBrowserOptimizations();
            maxRetries = optimizations.maxRetries;
            
            setTimeout(startRecognition, optimizations.delay);
            
        } catch (error) {
            console.error('Erreur lors du démarrage de la reconnaissance:', error);
            handleRecognitionError(error);
        }
    }
    
    // Fonction pour gérer les erreurs de reconnaissance (nouvelle)
    function handleRecognitionError(error) {
        isListening = false;
        
        if (recordBtn) {
            recordBtn.classList.remove('recording');
            recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Enregistrer';
        }
        
        deactivateRecordingWaves();
        normalizeAudioAnimations();
        
        let errorMessage = 'Impossible de démarrer l\'enregistrement.';
        
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            errorMessage += ' Assurez-vous que le microphone est autorisé dans Safari.';
        }
        
        if (feedbackText) {
            feedbackText.textContent = errorMessage;
            setFeedbackTextColor('error');
        }
        
        // Suggérer de réessayer après un délai
        setTimeout(() => {
            if (feedbackText && feedbackText.textContent === errorMessage) {
                feedbackText.textContent = 'Appuyez sur le microphone pour réessayer.';
                setFeedbackTextColor('neutral');
            }
        }, 3000);
    }
    
    // Fonction pour arrêter la reconnaissance vocale (améliorée avec nettoyage)
    function stopListening() {
        if (!recognition || !isListening) return;
        
        // Nettoyer le timeout
        if (recognitionTimeout) {
            clearTimeout(recognitionTimeout);
            recognitionTimeout = null;
        }
        
        try {
            recognition.stop();
            console.log('Arrêt de la reconnaissance vocale');
            
            if (feedbackText) {
                feedbackText.textContent = 'Arrêt de l\'enregistrement...';
                setFeedbackTextColor('neutral');
            }
        } catch (error) {
            console.error('Erreur lors de l\'arrêt de la reconnaissance:', error);
            
            // Forcer l'arrêt en cas d'erreur
            isListening = false;
            if (recordBtn) {
                recordBtn.classList.remove('recording');
                recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Enregistrer';
            }
            deactivateRecordingWaves();
            normalizeAudioAnimations();
        }
    }
    
    // Fonction pour traiter le résultat de la reconnaissance vocale
    function processSpeechResult(spokenText, confidence) {
        if (!currentWord) return;
        
        const targetWord = currentWord.word.toLowerCase().trim();
        console.log('Comparaison:', { spoken: spokenText, target: targetWord });
        
        // Afficher le texte reconnu
        if (recognizedText) {
            recognizedText.textContent = `"${spokenText}"`;
        }
        
        // Calculer la précision basée sur la similarité et la confiance
        let accuracy = calculatePronunciationAccuracy(spokenText, targetWord, confidence);
        
        console.log('Précision calculée:', accuracy);
        updateAccuracy(accuracy);
    }
    
    // Fonction pour calculer la précision de la prononciation
    function calculatePronunciationAccuracy(spoken, target, confidence) {
        // Normaliser les textes
        const normalizedSpoken = spoken.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const normalizedTarget = target.toLowerCase().replace(/[^\w\s]/g, '').trim();
        
        console.log('Comparaison:', { spoken: normalizedSpoken, target: normalizedTarget });
        
        // Correspondance exacte - seule façon d'obtenir un score parfait
        if (normalizedSpoken === normalizedTarget) {
            console.log('Correspondance exacte détectée');
            return Math.min(95 + (confidence * 5), 100);
        }
        
        // Vérifier si le mot parlé contient le mot cible ou vice versa (pour les mots composés)
        const spokenContainsTarget = normalizedSpoken.includes(normalizedTarget);
        const targetContainsSpoken = normalizedTarget.includes(normalizedSpoken);
        
        if (spokenContainsTarget || targetContainsSpoken) {
            console.log('Correspondance partielle détectée (mot contenu)');
            // Réduire le score pour les correspondances partielles
            const containmentScore = Math.min(75 + (confidence * 15), 85);
            return Math.round(containmentScore);
        }
        
        // Calculer la similarité de Levenshtein (plus stricte)
        const levenshteinSimilarity = calculateLevenshteinSimilarity(normalizedSpoken, normalizedTarget);
        console.log('Similarité Levenshtein:', levenshteinSimilarity);
        
        // Seuil strict pour la similarité
        if (levenshteinSimilarity < 0.6) {
            return Math.max(10, Math.round(levenshteinSimilarity * 30)); // Score très bas pour mots très différents
        }
        
        // Vérifier les variantes phonétiques communes seulement si la similarité est élevée
        if (levenshteinSimilarity >= 0.7) {
            const phoneticVariants = getPhoneticVariants(normalizedTarget);
            for (const variant of phoneticVariants) {
                if (normalizedSpoken === variant) {
                    console.log('Variante phonétique détectée:', variant);
                    return Math.min(80 + (confidence * 10), 90);
                }
            }
        }
        
        // Score basé sur la similarité avec des seuils plus stricts
        let baseAccuracy = levenshteinSimilarity * 70; // Réduire le multiplicateur
        
        // Bonus pour les mots qui commencent ou finissent de la même façon (seulement si assez similaires)
        if (levenshteinSimilarity >= 0.5 && normalizedSpoken.length > 2 && normalizedTarget.length > 2) {
            const startMatch = normalizedSpoken.substring(0, 2) === normalizedTarget.substring(0, 2);
            const endMatch = normalizedSpoken.slice(-2) === normalizedTarget.slice(-2);
            if (startMatch || endMatch) {
                baseAccuracy += 5; // Bonus réduit
            }
        }
        
        // Pénalité pour les mots très différents en longueur
        const lengthDifference = Math.abs(normalizedSpoken.length - normalizedTarget.length);
        const maxLength = Math.max(normalizedSpoken.length, normalizedTarget.length);
        const lengthSimilarity = 1 - (lengthDifference / maxLength);
        
        if (lengthSimilarity < 0.7) {
            baseAccuracy *= 0.7; // Pénalité pour longueurs très différentes
        }
        
        // Bonus de confiance réduit
        let confidenceBonus = confidence * 10; // Réduire le bonus de confiance
        
        // Score final avec plafond plus bas
        let finalAccuracy = Math.min(baseAccuracy + confidenceBonus, 75); // Plafond à 75% pour les non-correspondances
        
        // Assurer un minimum seulement si quelque chose a été reconnu et est similaire
        if (normalizedSpoken.length > 0 && levenshteinSimilarity >= 0.3) {
            finalAccuracy = Math.max(finalAccuracy, 15);
        } else {
            finalAccuracy = Math.max(finalAccuracy, 5); // Score très bas pour mots complètement différents
        }
        
        console.log('Score final calculé:', Math.round(finalAccuracy));
        return Math.round(finalAccuracy);
    }
    
    // Fonction pour calculer la similarité de Levenshtein (plus précise)
    function calculateLevenshteinSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        if (str1.length === 0 || str2.length === 0) return 0.0;
        
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;
        
        // Initialiser la matrice
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }
        
        // Calculer la distance de Levenshtein
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,     // suppression
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j - 1] + cost // substitution
                );
            }
        }
        
        const distance = matrix[len1][len2];
        const maxLength = Math.max(len1, len2);
        
        // Retourner la similarité (1 - distance normalisée)
        return 1 - (distance / maxLength);
    }
    
    // Fonction pour obtenir des variantes phonétiques communes (plus restrictive)
    function getPhoneticVariants(word) {
        const variants = [word];
        
        // Variantes communes en anglais (plus restrictives)
        const phoneticRules = [
            // 'ph' -> 'f' seulement si le mot contient 'ph'
            [/ph/g, 'f'],
            // 'ck' -> 'k' seulement en fin de mot
            [/ck$/g, 'k'],
            // Doubles lettres -> simple (seulement certaines)
            [/ll/g, 'l'],
            [/ss/g, 's'],
            [/tt/g, 't'],
            // 'c' -> 'k' dans certains contextes spécifiques
            [/c([aou])/g, 'k$1']
        ];
        
        phoneticRules.forEach(([pattern, replacement]) => {
            if (pattern.test(word)) { // Seulement si le pattern existe dans le mot
                const variant = word.replace(pattern, replacement);
                if (variant !== word && !variants.includes(variant)) {
                    variants.push(variant);
                }
            }
        });
        
        return variants;
    }
    
    // Fonction pour mettre à jour la précision
    function updateAccuracy(accuracy) {
        if (accuracyMeter) {
            const meterFill = accuracyMeter.querySelector('.meter-fill');
            if (meterFill) meterFill.style.width = `${accuracy}%`;
        }
        
        if (accuracyValueDisplay) {
            accuracyValueDisplay.textContent = `${Math.round(accuracy)}%`;
        }
        
        if (feedbackText) {
            let message = '';
            if (accuracy >= 90) {
                message = 'Excellent ! Prononciation parfaite !';
                perfectPronunciations++;
            } else if (accuracy >= 75) {
                message = 'Très bien ! Bonne prononciation !';
            } else if (accuracy >= 60) {
                message = 'Bien ! Prononciation correcte !';
            } else if (accuracy >= 40) {
                message = 'Pas mal ! Continuez à vous entraîner !';
            } else if (accuracy >= 20) {
                message = 'Essayez encore ! Écoutez bien la prononciation.';
            } else {
                message = 'Mot incorrect. Réessayez en écoutant attentivement.';
            }
            feedbackText.textContent = message;
        }
        
        totalAccuracy += accuracy;
        completedWords++;
        if (wordsCountDisplay) wordsCountDisplay.textContent = completedWords;
        
        // Vérifier si le jeu doit se terminer (par exemple après 10 mots)
        if (completedWords >= 10) {
            setTimeout(() => {
                endGame();
            }, 2000);
        } else {
            setTimeout(() => {

                // Réinitialiser le compteur de tentatives
                attemptCount = 0;
                let randomIndex = Math.floor(Math.random() * words.length);
                while (currentIndex === randomIndex) {
                    randomIndex = Math.floor(Math.random() * words.length);
                }
                currentIndex = randomIndex;
                
                // Mettre à jour le mot courant
                currentWord = words[currentIndex];
                
                // Afficher le mot et sa prononciation phonétique
                if (currentWordDisplay) currentWordDisplay.textContent = currentWord.word;
                if (phoneticSpellingDisplay) phoneticSpellingDisplay.textContent = currentWord.pronunciation ;
                
                // Activer le bouton d'écoute
                if (playWordBtn) {
                    playWordBtn.disabled = false;
                    playWordBtn.classList.remove('disabled');
                }
                
                // Réinitialiser l'affichage de feedback
                if (accuracyMeter) {
                    const meterFill = accuracyMeter.querySelector('.meter-fill');
                    if (meterFill) meterFill.style.width = '0%';
                }
                if (recognizedText) recognizedText.textContent = '';
                if (feedbackText) feedbackText.textContent = '';
                
                // Animation d'apparition du mot
                if (currentWordDisplay) {
                    currentWordDisplay.classList.add('fadeIn');
                    setTimeout(() => {
                        currentWordDisplay.classList.remove('fadeIn');
                    }, 500);
                }

                // Configurer la reconnaissance vocale
                setupSpeechRecognition();
                
                // Mettre à jour la langue si nécessaire
                if (currentWord.language_code) {
                    currentLanguage = currentWord.language_code;
                    if (recognition) {
                        recognition.lang = currentLanguage;
                        console.log('Langue mise à jour pour le nouveau mot:', currentLanguage);
                    }
                }
            }, 2000);
        }
    }

    // Fonction pour terminer le jeu
    function endGame() {
        console.log('Ending game...');
        gameActive = false;
        clearInterval(timerInterval);
        
        const finalTime = Date.now() - startTime;
        const averageAccuracy = completedWords > 0 ? totalAccuracy / completedWords : 0;
        
        // Mettre à jour l'écran de fin de jeu
        if (finalScoreDisplay) finalScoreDisplay.textContent = Math.round(averageAccuracy);
        if (finalTimeDisplay) finalTimeDisplay.textContent = formatTime(finalTime);
        if (finalAccuracyDisplay) finalAccuracyDisplay.textContent = `${Math.round(averageAccuracy)}%`;
        if (perfectCountDisplay) perfectCountDisplay.textContent = perfectPronunciations;
        
        // Enregistrer le score
        saveScore(Math.round(averageAccuracy));
        
        // Suivre la progression de niveau
        const minAccuracy = 70;
        const isSuccessful = averageAccuracy >= minAccuracy && completedWords >= 5;
        trackLevelProgress(isSuccessful);
        

        // Afficher le message de progression de niveau
        if (trackLevelMessage) {
            if (isSuccessful) {
                trackLevelMessage.textContent = 'Excellent travail ! Progressez les autres jeux de ce niveau 😍';
                trackLevelMessage.classList.add('level-completed');
            } else {
                trackLevelMessage.textContent = 'Bon courage ! Réessayer ce jeu pour améliorer vos compétences 🤧' ;
                trackLevelMessage.classList.remove('level-completed');
            }
        }

        // Afficher l'écran de fin de jeu
        console.log('Switching to post game screen...');
        setTimeout(() => {
            if (activeGameScreen) activeGameScreen.classList.remove('active');
            if (postGameScreen) postGameScreen.classList.add('active');
            console.log('Post game screen should now be visible');
            
            // Lancer l'animation confetti simple
            launchConfetti();
        }, 1000);
    }

     // Fonction pour lancer l'animation confetti avec confetti.js.org
     function launchConfetti() {
        const duration = 15* 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
          
            if (timeLeft <= 0) {
              return clearInterval(interval);
            }
          
            const particleCount = 50 * (timeLeft / duration);
          
            // since particles fall down, start a bit higher than random
            confetti(
              Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
              })
            );
            confetti(
              Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
              })
            );
          }, 250);
    }
    
    // Fonction pour enregistrer le score
    function saveScore(score) {
        fetch('/games/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                game_type: 'test_pronun',
                score: score,
                details: {
                    completed_words: completedWords,
                    average_accuracy: Math.round(totalAccuracy / completedWords),
                    perfect_pronunciations: perfectPronunciations,
                    time_taken: Date.now() - startTime
                }
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Score enregistré avec succès:', data);
            if (data.isHighScore && highScoreMessage) {
                highScoreMessage.textContent = 'Nouveau meilleur score !';
                highScoreMessage.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Erreur lors de l\'enregistrement du score:', error);
        });
    }
    
    // Fonction pour suivre la progression de niveau
    function trackLevelProgress(isSuccessful) {
        fetch(`/level-progress/track?package=${packageId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                game_type: 'test_pronun',
                completed: isSuccessful
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Progression de niveau mise à jour:', data);
            
            if (data.level_completed && data.words_updated > 0) {
                console.log(`Niveau terminé! ${data.words_updated} mots sont passés au niveau ${data.to_level}`);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la mise à jour de la progression de niveau:', error);
        });
    }
    
    // Événements
    if (startGameBtn) {
        startGameBtn.addEventListener('click', startGame);
        console.log('Start game button event listener added');
    }
    
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', startGame);
    }
    
    if (playWordBtn) {
        playWordBtn.addEventListener('click', () => {
            if (currentWord) {
                playWordAudio(currentWord);
            } else {
                console.log('Aucun mot disponible pour la lecture');
                if (feedbackText) {
                    feedbackText.textContent = 'Aucun mot disponible pour la lecture.';
                    setFeedbackTextColor('warning');
                }
            }
        });
    }

    // Fonction de test pour forcer l'affichage de l'écran de fin (pour débogage)
    window.testEndGame = function() {
        console.log('Testing end game...');
        totalAccuracy = 600;
        completedWords = 6;
        endGame();
    };
    
    // Ajouter un raccourci clavier pour tester (Ctrl+Shift+E)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'E') {
            console.log('Test end game triggered by keyboard shortcut');
            window.testEndGame();
        }
    });
    
    if (recordBtn) {
        recordBtn.addEventListener('click', async () => {
            // Pour Safari iOS, vérifier les permissions au premier clic
            if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !microphonePermissionGranted) {
                console.log('Premier clic sur Safari iOS - vérification des permissions');
                
                if (feedbackText) {
                    feedbackText.textContent = 'Vérification des permissions microphone...';
                    setFeedbackTextColor('info');
                }
                
                const granted = await checkMicrophonePermissions();
                if (!granted) {
                    return; // Arrêter si les permissions ne sont pas accordées
                }
                
                // Petit délai pour laisser le temps aux permissions de s'activer
                setTimeout(() => {
                    if (isListening) {
                        stopListening();
                    } else {
                        startListening();
                    }
                }, 300);
            } else {
                // Comportement normal pour les autres navigateurs ou après permissions accordées
                if (isListening) {
                    stopListening();
                } else {
                    startListening();
                }
            }
        });
    }
    
    if (skipWordBtn) {
        skipWordBtn.addEventListener('click', () => {
            if (gameActive) {
                loadNewWord();
            }
        });
    }
});

