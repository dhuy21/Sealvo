import { describe, expect, it } from 'vitest';
import { isRecommendedBrowser } from './browser-check';

const UA = {
  chrome:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  safari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  firefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
};

describe('isRecommendedBrowser', () => {
  it('accepts Chrome, Edge and Safari', () => {
    expect(isRecommendedBrowser(UA.chrome)).toBe(true);
    expect(isRecommendedBrowser(UA.edge)).toBe(true);
    expect(isRecommendedBrowser(UA.safari)).toBe(true);
  });

  it('rejects Firefox', () => {
    expect(isRecommendedBrowser(UA.firefox)).toBe(false);
  });
});
