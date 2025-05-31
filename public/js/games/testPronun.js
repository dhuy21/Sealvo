document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si nous sommes sur la page du jeu TestPronun
    if (!document.getElementById('testPronun-screen')) {
        // Nous ne sommes pas sur la page TestPronun, ne pas exécuter le script
        return;
    }
    
    console.log('TestPronun game script loaded');
    
    // Variables du jeu
    let currentWord = null;
    let previousWordId = null;
    let attemptCount = 0;
    let gameActive = false;
    let timerInterval = null;
    let startTime = null;
    let completedWords = 0;
    let totalAccuracy = 0;
    let perfectPronunciations = 0;
    let wordsList = [];
    
    // Variables pour la reconnaissance vocale (Web Speech API)
    let recognition = null;
    let isListening = false;
    let speechSupported = false;
    
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
    
    const finalScoreDisplay = document.getElementById('final-score');
    const finalTimeDisplay = document.getElementById('final-time');
    const finalAccuracyDisplay = document.getElementById('final-accuracy');
    const perfectCountDisplay = document.getElementById('perfect-count');
    const highScoreMessage = document.getElementById('high-score-message');
    
    // Écrans de jeu
    const preGameScreen = document.querySelector('.pre-game-screen');
    const activeGameScreen = document.querySelector('.active-game-screen');
    const postGameScreen = document.querySelector('.post-game-screen');
    
    console.log('DOM elements found:', {
        startBtn: !!startGameBtn,
        preGame: !!preGameScreen,
        activeGame: !!activeGameScreen,
        postGame: !!postGameScreen
    });
    
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
        console.log('Starting game...');
        
        // Réinitialiser les variables
        currentWord = null;
        previousWordId = null;
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
        
        // Démarrer le timer
        timerInterval = setInterval(updateTimer, 1000);
        
        // Configurer la reconnaissance vocale
        setupSpeechRecognition();
        
        // Charger le premier mot
        loadNewWord();
        
        // Afficher l'écran de jeu actif
        console.log('Switching to active game screen...');
        if (preGameScreen) {
            preGameScreen.classList.remove('active');
            console.log('Pre-game screen hidden');
        }
        if (activeGameScreen) {
            activeGameScreen.classList.add('active');
            console.log('Active game screen shown');
        }
        if (postGameScreen) {
            postGameScreen.classList.remove('active');
        }
    }
    
    // Fonction pour configurer la reconnaissance vocale (Web Speech API)
    function setupSpeechRecognition() {
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
        
        // Créer l'instance de reconnaissance vocale
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        // Configuration de la reconnaissance
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US'; // Langue anglaise pour la prononciation
        recognition.maxAlternatives = 3;
        
        // Événements de la reconnaissance vocale
        recognition.onstart = () => {
            console.log('Reconnaissance vocale démarrée');
            isListening = true;
            if (recordBtn) {
                recordBtn.classList.add('recording');
                recordBtn.innerHTML = '<i class="fas fa-stop"></i> Arrêter';
            }
        };
        
        recognition.onresult = (event) => {
            console.log('Résultat de reconnaissance reçu');
            const results = event.results[0];
            const spokenText = results[0].transcript.toLowerCase().trim();
            const confidence = results[0].confidence;
            
            console.log('Texte reconnu:', spokenText);
            console.log('Confiance:', confidence);
            
            // Traiter le résultat
            processSpeechResult(spokenText, confidence);
        };
        
        recognition.onerror = (event) => {
            console.error('Erreur de reconnaissance vocale:', event.error);
            isListening = false;
            if (recordBtn) {
                recordBtn.classList.remove('recording');
                recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Enregistrer';
            }
            
            // Afficher un message d'erreur approprié
            let errorMessage = 'Erreur de reconnaissance vocale';
            switch (event.error) {
                case 'no-speech':
                    errorMessage = 'Aucune parole détectée. Essayez de parler plus fort.';
                    break;
                case 'audio-capture':
                    errorMessage = 'Impossible d\'accéder au microphone.';
                    break;
                case 'not-allowed':
                    errorMessage = 'Permission microphone refusée.';
                    break;
                case 'network':
                    errorMessage = 'Erreur réseau. Vérifiez votre connexion.';
                    break;
            }
            
            if (feedbackText) {
                feedbackText.textContent = errorMessage;
                feedbackText.style.color = '#e53e3e';
            }
        };
        
        recognition.onend = () => {
            console.log('Reconnaissance vocale terminée');
            isListening = false;
            if (recordBtn) {
                recordBtn.classList.remove('recording');
                recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Enregistrer';
            }
        };
        
        console.log('Reconnaissance vocale configurée avec succès');
    }
    
    // Fonction pour charger un nouveau mot
    function loadNewWord() {
        if (attemptCount > 5) {
            console.log("Vocabulaire limité, acceptation du même mot après 5 tentatives");
            attemptCount = 0;
        }
        
        fetch(`/games/testPronun/word?previous=${previousWordId || ''}`, {
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
            
            // Vérifier si le nouveau mot est le même que le précédent
            if (previousWordId && data.id === previousWordId) {
                attemptCount++;
                console.log(`Mot identique au précédent (tentative ${attemptCount}), rechargement...`);
                
                setTimeout(() => {
                    loadNewWord();
                }, 100);
                return;
            }
            
            // Réinitialiser le compteur de tentatives
            attemptCount = 0;
            
            // Stocker l'ID du mot actuel
            previousWordId = data.id;
            
            // Mettre à jour le mot courant
            currentWord = data;
            wordsList.push(data);
            
            console.log('New word loaded:', data.word);
            
            // Afficher le mot et sa prononciation phonétique
            if (currentWordDisplay) currentWordDisplay.textContent = data.word;
            if (phoneticSpellingDisplay) phoneticSpellingDisplay.textContent = data.pronunciation ;
            
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
        })
        .catch(error => {
            console.error('Erreur lors du chargement du mot:', error);
            alert('Une erreur est survenue lors du chargement du mot.');
        });
    }
    
    // Fonction pour démarrer la reconnaissance vocale
    function startListening() {
        if (!recognition || !speechSupported) {
            console.error('Reconnaissance vocale non disponible');
            return;
        }
        
        if (isListening) {
            stopListening();
            return;
        }
        
        try {
            recognition.start();
            console.log('Démarrage de la reconnaissance vocale');
        } catch (error) {
            console.error('Erreur lors du démarrage de la reconnaissance:', error);
        }
    }
    
    // Fonction pour arrêter la reconnaissance vocale
    function stopListening() {
        if (!recognition || !isListening) return;
        
        try {
            recognition.stop();
            console.log('Arrêt de la reconnaissance vocale');
        } catch (error) {
            console.error('Erreur lors de l\'arrêt de la reconnaissance:', error);
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
        
        // Correspondance exacte
        if (normalizedSpoken === normalizedTarget) {
            return Math.min(95 + (confidence * 5), 100);
        }
        
        // Vérifier si le mot parlé contient le mot cible (pour les mots composés)
        if (normalizedSpoken.includes(normalizedTarget) || normalizedTarget.includes(normalizedSpoken)) {
            const containmentBonus = 20;
            return Math.min(80 + containmentBonus + (confidence * 10), 95);
        }
        
        // Vérifier les variantes phonétiques communes
        const phoneticVariants = getPhoneticVariants(normalizedTarget);
        for (const variant of phoneticVariants) {
            if (normalizedSpoken === variant) {
                return Math.min(85 + (confidence * 10), 95);
            }
        }
        
        // Calculer la similarité pour les mots proches
        const similarity = calculateSimilarity(normalizedSpoken, normalizedTarget);
        
        // Combiner la similarité avec la confiance de la reconnaissance
        let baseAccuracy = similarity * 100;
        let confidenceBonus = confidence * 15; // Bonus basé sur la confiance
        
        // Bonus pour les mots qui commencent ou finissent de la même façon
        if (normalizedSpoken.length > 2 && normalizedTarget.length > 2) {
            const startMatch = normalizedSpoken.substring(0, 2) === normalizedTarget.substring(0, 2);
            const endMatch = normalizedSpoken.slice(-2) === normalizedTarget.slice(-2);
            if (startMatch || endMatch) {
                baseAccuracy += 10;
            }
        }
        
        // Pénalité pour les mots très différents
        if (similarity < 0.3) {
            baseAccuracy *= 0.6;
        }
        
        // Score final
        let finalAccuracy = Math.min(baseAccuracy + confidenceBonus, 100);
        
        // Assurer un minimum de 15% si au moins quelque chose a été reconnu
        if (normalizedSpoken.length > 0) {
            finalAccuracy = Math.max(finalAccuracy, 15);
        }
        
        return Math.round(finalAccuracy);
    }
    
    // Fonction pour obtenir des variantes phonétiques communes
    function getPhoneticVariants(word) {
        const variants = [word];
        
        // Variantes communes en anglais
        const phoneticRules = [
            // Suppression du 'h' muet
            [/^h/, ''],
            // 'ph' -> 'f'
            [/ph/g, 'f'],
            // 'ght' -> 't'
            [/ght/g, 't'],
            // 'ck' -> 'k'
            [/ck/g, 'k'],
            // Doubles lettres -> simple
            [/(.)\1+/g, '$1'],
            // 'c' -> 'k' dans certains contextes
            [/c([aou])/g, 'k$1'],
            // 'y' -> 'i' en fin de mot
            [/y$/g, 'i']
        ];
        
        phoneticRules.forEach(([pattern, replacement]) => {
            const variant = word.replace(pattern, replacement);
            if (variant !== word && !variants.includes(variant)) {
                variants.push(variant);
            }
        });
        
        return variants;
    }
    
    // Fonction pour calculer la similarité entre deux chaînes (algorithme de Jaro-Winkler simplifié)
    function calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        if (str1.length === 0 || str2.length === 0) return 0.0;
        
        const maxDistance = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
        const matches1 = new Array(str1.length).fill(false);
        const matches2 = new Array(str2.length).fill(false);
        let matches = 0;
        let transpositions = 0;
        
        // Trouver les correspondances
        for (let i = 0; i < str1.length; i++) {
            const start = Math.max(0, i - maxDistance);
            const end = Math.min(i + maxDistance + 1, str2.length);
            
            for (let j = start; j < end; j++) {
                if (matches2[j] || str1[i] !== str2[j]) continue;
                matches1[i] = matches2[j] = true;
                matches++;
                break;
            }
        }
        
        if (matches === 0) return 0.0;
        
        // Calculer les transpositions
        let k = 0;
        for (let i = 0; i < str1.length; i++) {
            if (!matches1[i]) continue;
            while (!matches2[k]) k++;
            if (str1[i] !== str2[k]) transpositions++;
            k++;
        }
        
        const jaro = (matches / str1.length + matches / str2.length + (matches - transpositions / 2) / matches) / 3;
        
        // Bonus Winkler pour les préfixes communs
        let prefix = 0;
        for (let i = 0; i < Math.min(str1.length, str2.length, 4); i++) {
            if (str1[i] === str2[i]) prefix++;
            else break;
        }
        
        return jaro + (0.1 * prefix * (1 - jaro));
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
                feedbackText.style.color = '#48bb78';
                perfectPronunciations++;
            } else if (accuracy >= 70) {
                message = 'Bien ! Bonne prononciation !';
                feedbackText.style.color = '#4299e1';
            } else if (accuracy >= 50) {
                message = 'Pas mal ! Continuez à vous entraîner !';
                feedbackText.style.color = '#f6ad55';
            } else {
                message = 'Essayez encore ! Écoutez bien la prononciation.';
                feedbackText.style.color = '#e53e3e';
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
                loadNewWord();
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
        
        // Afficher l'écran de fin de jeu
        console.log('Switching to post game screen...');
        if (activeGameScreen) activeGameScreen.classList.remove('active');
        if (postGameScreen) postGameScreen.classList.add('active');
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
        fetch('/level-progress/track', {
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
            if (currentWord && currentWord.audio) {
                const audio = new Audio(currentWord.audio);
                audio.play();
            }
        });
    }
    
    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            if (isListening) {
                stopListening();
            } else {
                startListening();
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
    
    console.log('TestPronun game script initialization complete');
});
