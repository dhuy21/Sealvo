import { THROTTLE, throttleMessage } from './throttle-policies.js';

describe('throttle policies', () => {
  it.each([
    ['DEFAULT', 'Trop de requêtes. Réessayez dans 1 minute.'],
    ['REGISTER', "Trop de tentatives d'inscription. Réessayez dans 15 minutes."],
    ['LOGIN', 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'],
    ['RESET_PASSWORD', 'Trop de tentatives de réinitialisation. Réessayez dans 15 minutes.'],
    ['FORGOT_PASSWORD', 'Trop de demandes de réinitialisation. Réessayez dans 1 heure.'],
    ['RESEND_VERIFICATION', "Trop de demandes d'email de vérification. Réessayez dans 1 heure."],
    ['REMINDER_EMAIL', "Trop d'emails envoyés. Réessayez dans 1 heure."],
    ['FEEDBACK', 'Trop de feedbacks envoyés. Réessayez dans 1 heure.'],
    ['TTS', 'Trop de requêtes TTS. Réessayez dans 1 minute.'],
    ['COPY_PACKAGE', 'Trop de copies de packages. Réessayez dans 1 heure.'],
  ] as const)('%s states its own window', (policy, message) => {
    expect(throttleMessage(THROTTLE[policy])).toBe(message);
  });
});
