/** Start delay, automatic retries and listening timeout (ms) suited to the browser. */
export function browserOptimizations(userAgent: string): {
  delay: number;
  maxRetries: number;
  timeout: number;
} {
  if (/iPad|iPhone|iPod/.test(userAgent)) return { delay: 300, maxRetries: 2, timeout: 8000 };
  if (/Chrome|Edge/.test(userAgent)) return { delay: 50, maxRetries: 3, timeout: 12000 };
  if (/Firefox/.test(userAgent)) return { delay: 150, maxRetries: 2, timeout: 10000 };
  return { delay: 100, maxRetries: 3, timeout: 10000 };
}

/** Message of a recognition error, and whether to retry automatically (only while `canRetry`). */
export function errorInfo(error: string, canRetry: boolean): { message: string; retry: boolean } {
  switch (error) {
    case 'no-speech':
      return {
        message: 'Aucune parole détectée. Parlez plus fort et plus clairement.',
        retry: canRetry,
      };
    case 'audio-capture':
      return {
        message: "Impossible d'accéder au microphone. Vérifiez les permissions.",
        retry: false,
      };
    case 'not-allowed':
      return {
        message: 'Permission microphone refusée. Activez le microphone dans les paramètres.',
        retry: false,
      };
    case 'network':
      return { message: 'Erreur réseau. Vérifiez votre connexion internet.', retry: canRetry };
    case 'aborted':
      return { message: 'Reconnaissance interrompue. Essayez à nouveau.', retry: canRetry };
    case 'service-not-allowed':
      return {
        message: 'Service de reconnaissance non autorisé. Essayez de recharger la page.',
        retry: false,
      };
    default:
      return { message: `Erreur: ${error}. Essayez de recharger la page.`, retry: canRetry };
  }
}
