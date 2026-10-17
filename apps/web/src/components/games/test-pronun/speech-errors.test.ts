import { describe, expect, it } from 'vitest';
import { browserOptimizations, errorInfo } from './speech-errors';

describe('browserOptimizations', () => {
  it('picks the settings of the browser in the user agent', () => {
    expect(
      browserOptimizations('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Version/17.0 Safari'),
    ).toEqual({
      delay: 300,
      maxRetries: 2,
      timeout: 8000,
    });
    expect(browserOptimizations('Mozilla/5.0 (X11; Linux) Chrome/120.0 Safari/537.36')).toEqual({
      delay: 50,
      maxRetries: 3,
      timeout: 12000,
    });
    expect(browserOptimizations('Mozilla/5.0 (X11; Linux; rv:120.0) Gecko Firefox/120.0')).toEqual({
      delay: 150,
      maxRetries: 2,
      timeout: 10000,
    });
    expect(browserOptimizations('Mozilla/5.0 (Macintosh) Version/17.0 Safari/605.1.15')).toEqual({
      delay: 100,
      maxRetries: 3,
      timeout: 10000,
    });
  });

  it('treats iOS Chrome as iOS', () => {
    expect(browserOptimizations('Mozilla/5.0 (iPhone) CriOS/120.0 Chrome Mobile').delay).toBe(300);
  });
});

describe('errorInfo', () => {
  it.each(['no-speech', 'network', 'aborted', 'unknown-error'])(
    'retries %s while retries remain',
    (error) => {
      expect(errorInfo(error, true).retry).toBe(true);
      expect(errorInfo(error, false).retry).toBe(false);
    },
  );

  it.each(['audio-capture', 'not-allowed', 'service-not-allowed'])('never retries %s', (error) => {
    expect(errorInfo(error, true).retry).toBe(false);
  });

  it('names unknown errors in the message', () => {
    expect(errorInfo('bad-grammar', true).message).toBe(
      'Erreur: bad-grammar. Essayez de recharger la page.',
    );
  });

  it('explains a missing microphone permission', () => {
    expect(errorInfo('not-allowed', true).message).toBe(
      'Permission microphone refusée. Activez le microphone dans les paramètres.',
    );
  });
});
