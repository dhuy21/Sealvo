import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useIsClient } from '@/hooks/use-is-client';
import { useTimeouts } from '@/hooks/use-timeouts';
import type { SetFeedback } from './use-feedback';
import type {
  SpeechRecognitionErrorEvent,
  SpeechRecognitionEvent,
  SpeechRecognitionInstance,
} from './speech-recognition';
import { browserOptimizations, errorInfo } from './speech-errors';

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

/**
 * One Web Speech recognition instance for the page, with the old client's
 * feedback messages, automatic retries and iOS microphone-permission handling.
 */
export function useSpeechRecognition({
  language,
  onResult,
  onListenStart,
  setFeedback,
  getFeedbackText,
}: {
  language: string;
  onResult: (spokenText: string, confidence: number) => void;
  onListenStart: () => void;
  setFeedback: SetFeedback;
  getFeedbackText: () => string;
}) {
  const isClient = useIsClient();
  const supported = isClient && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const [isListening, setIsListeningState] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  const listeningRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryCountRef = useRef(0);
  const maxRetriesRef = useRef(3);
  const micGrantedRef = useRef(false);
  const gotResultRef = useRef(false);
  const languageRef = useRef(language);
  const later = useTimeouts();

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const setListening = (value: boolean) => {
    listeningRef.current = value;
    setIsListeningState(value);
  };

  const showThenHint = (message: string, hint: string, delay: number) => {
    later(() => {
      if (getFeedbackText() === message) setFeedback(hint, 'neutral');
    }, delay);
  };

  const checkMicrophonePermissions = async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('getUserMedia non supporté');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      micGrantedRef.current = true;
      return true;
    } catch (error) {
      console.error('Permission microphone refusée:', error);
      micGrantedRef.current = false;
      setFeedback('Permission microphone requise. Activez-la dans les paramètres.', 'error');
      return false;
    }
  };

  const failToStart = () => {
    setListening(false);
    const message = `Impossible de démarrer l'enregistrement.${
      isIOS() ? ' Assurez-vous que le microphone est autorisé dans Safari.' : ''
    }`;
    setFeedback(message, 'error');
    showThenHint(message, 'Appuyez sur le microphone pour réessayer.', 3000);
  };

  const stop = () => {
    const recognition = recognitionRef.current;
    if (!recognition || !listeningRef.current) return;
    clearTimeout(timeoutRef.current);
    try {
      recognition.stop();
      setFeedback("Arrêt de l'enregistrement...", 'neutral');
    } catch (error) {
      console.error("Erreur lors de l'arrêt de la reconnaissance:", error);
      setListening(false);
    }
  };

  const start = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      console.error('Reconnaissance vocale non disponible');
      setFeedback('Reconnaissance vocale non supportée sur ce navigateur.', 'error');
      return;
    }
    if (listeningRef.current) {
      stop();
      return;
    }
    if (isIOS()) {
      if (!micGrantedRef.current) {
        checkMicrophonePermissions().then((granted) => {
          if (granted) later(start, 500);
        });
        return;
      }
      if (!document.hasFocus()) {
        setFeedback("Appuyez sur l'écran puis sur le microphone.", 'warning');
        return;
      }
    }

    onListenStart();
    gotResultRef.current = false;
    setFeedback("Préparation de l'enregistrement...", 'info');
    recognition.lang = languageRef.current;

    const { delay, maxRetries } = browserOptimizations(navigator.userAgent);
    maxRetriesRef.current = maxRetries;
    later(() => {
      try {
        recognition.start();
      } catch (error) {
        console.error('Erreur lors du démarrage de la reconnaissance:', error);
        failToStart();
      }
    }, delay);
  };

  const handleStart = useEffectEvent(() => {
    setListening(true);
    setHasListened(true);
    setFeedback('Écoute en cours... Parlez maintenant.', 'info');
    timeoutRef.current = setTimeout(() => {
      if (listeningRef.current) stop();
    }, browserOptimizations(navigator.userAgent).timeout);
  });

  const handleResult = useEffectEvent((event: SpeechRecognitionEvent) => {
    clearTimeout(timeoutRef.current);
    if (event.results.length === 0) return;
    const results = event.results[0];
    if (results && results.length > 0) {
      gotResultRef.current = true;
      onResult(results[0].transcript.toLowerCase().trim(), results[0].confidence || 0.5);
    } else {
      console.warn('Aucun résultat de reconnaissance disponible');
      setFeedback('Aucun son détecté. Essayez de parler plus fort.', 'warning');
    }
  });

  const handleError = useEffectEvent((event: SpeechRecognitionErrorEvent) => {
    clearTimeout(timeoutRef.current);
    console.error('Erreur de reconnaissance vocale:', event.error);
    setListening(false);

    const maxRetries = maxRetriesRef.current;
    const { message, retry } = errorInfo(event.error, retryCountRef.current < maxRetries);
    setFeedback(message, 'error');

    if (retry) {
      const attempt = ++retryCountRef.current;
      later(() => {
        setFeedback(`Nouvelle tentative (${attempt}/${maxRetries})...`, 'info');
        start();
      }, 1000);
    } else {
      retryCountRef.current = 0;
      if (isIOS()) showThenHint(message, 'Appuyez sur le bouton microphone pour réessayer.', 3000);
    }
  });

  const handleEnd = useEffectEvent(() => {
    clearTimeout(timeoutRef.current);
    setListening(false);
    if (isIOS()) {
      later(() => {
        if (!gotResultRef.current) {
          setFeedback(
            'Reconnaissance terminée. Appuyez sur le microphone pour réessayer.',
            'neutral',
          );
        }
      }, 1000);
    }
  });

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Web Speech API non supportée par ce navigateur');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => handleStart();
    recognition.onresult = (event) => handleResult(event);
    recognition.onerror = (event) => handleError(event);
    recognition.onend = () => handleEnd();
    recognitionRef.current = recognition;

    return () => {
      clearTimeout(timeoutRef.current);
      recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        /* ignored */
      }
      recognitionRef.current = null;
    };
  }, []);

  /** The record button: a click starts a fresh series of automatic retries. */
  const toggle = async () => {
    retryCountRef.current = 0;
    if (isIOS() && !micGrantedRef.current) {
      setFeedback('Vérification des permissions microphone...', 'info');
      if (!(await checkMicrophonePermissions())) return;
      later(() => (listeningRef.current ? stop() : start()), 300);
      return;
    }
    if (listeningRef.current) stop();
    else start();
  };

  return { supported, isListening, hasListened, toggle };
}
