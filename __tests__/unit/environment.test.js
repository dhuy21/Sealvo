/**
 * Unit tests: app/config/environment.js
 *
 * NODE_ENV is captured at module load time, so jest.resetModules()
 * is required before each test to get a fresh module instance.
 */

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_BASE_URL = process.env.BASE_URL;

afterEach(() => {
  jest.resetModules();
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  if (ORIGINAL_BASE_URL === undefined) {
    delete process.env.BASE_URL;
  } else {
    process.env.BASE_URL = ORIGINAL_BASE_URL;
  }
});

function load() {
  return require('../../app/config/environment');
}

describe('environment helpers (unit)', () => {
  describe('production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('isProduction() is true', () => {
      expect(load().isProduction()).toBe(true);
    });

    it('isStaging() is false', () => {
      expect(load().isStaging()).toBe(false);
    });

    it('isDevelopment() is false', () => {
      expect(load().isDevelopment()).toBe(false);
    });

    it('isProductionLike() is true', () => {
      expect(load().isProductionLike()).toBe(true);
    });
  });

  describe('staging environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'staging';
    });

    it('isStaging() is true', () => {
      expect(load().isStaging()).toBe(true);
    });

    it('isProduction() is false', () => {
      expect(load().isProduction()).toBe(false);
    });

    it('isDevelopment() is false', () => {
      expect(load().isDevelopment()).toBe(false);
    });

    it('isProductionLike() is true', () => {
      expect(load().isProductionLike()).toBe(true);
    });
  });

  describe('development environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('isDevelopment() is true', () => {
      expect(load().isDevelopment()).toBe(true);
    });

    it('isProduction() is false', () => {
      expect(load().isProduction()).toBe(false);
    });

    it('isStaging() is false', () => {
      expect(load().isStaging()).toBe(false);
    });

    it('isProductionLike() is false', () => {
      expect(load().isProductionLike()).toBe(false);
    });
  });

  describe('NODE_ENV unset', () => {
    beforeEach(() => {
      delete process.env.NODE_ENV;
    });

    it('defaults to development: isDevelopment() is true', () => {
      expect(load().isDevelopment()).toBe(true);
    });

    it('isProductionLike() is false', () => {
      expect(load().isProductionLike()).toBe(false);
    });
  });

  describe('getBaseUrl()', () => {
    it('returns BASE_URL when set', () => {
      process.env.NODE_ENV = 'development';
      process.env.BASE_URL = 'http://localhost:3000';
      expect(load().getBaseUrl()).toBe('http://localhost:3000');
    });

    it('returns production URL as fallback when BASE_URL is not set', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.BASE_URL;
      expect(load().getBaseUrl()).toBe('https://www.sealvo.it.com');
    });

    it('returns BASE_URL for staging environment', () => {
      process.env.NODE_ENV = 'staging';
      process.env.BASE_URL = 'https://staging.sealvo.it.com';
      expect(load().getBaseUrl()).toBe('https://staging.sealvo.it.com');
    });
  });
});
