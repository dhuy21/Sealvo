const express = require('express');
const request = require('supertest');
const { initializeSecurity } = require('../../app/middleware/security');

function createApp() {
  const app = express();
  initializeSecurity(app);
  app.get('/test', (_req, res) => {
    res.json({ nonce: res.locals.nonce });
  });
  return app;
}

describe('Security headers (integration)', () => {
  let response;

  beforeAll(async () => {
    response = await request(createApp()).get('/test');
  });

  // --- Permissions-Policy (Phase 3) ---

  describe('Permissions-Policy', () => {
    it('sets the Permissions-Policy header', () => {
      expect(response.headers['permissions-policy']).toBeDefined();
    });

    it.each(['camera=()', 'geolocation=()', 'payment=()', 'usb=()'])('blocks %s', (directive) => {
      expect(response.headers['permissions-policy']).toContain(directive);
    });

    it.each(['microphone=(self)', 'autoplay=(self)'])('allows %s', (directive) => {
      expect(response.headers['permissions-policy']).toContain(directive);
    });
  });

  // --- Content-Security-Policy (Phase 3) ---

  describe('CSP', () => {
    it('sets Content-Security-Policy header', () => {
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('includes strict-dynamic in script-src', () => {
      expect(response.headers['content-security-policy']).toContain("'strict-dynamic'");
    });

    it('includes a nonce in script-src', () => {
      expect(response.headers['content-security-policy']).toMatch(/nonce-[A-Za-z0-9+/=]+/);
    });

    it("sets default-src to 'self'", () => {
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it("sets object-src to 'none'", () => {
      expect(response.headers['content-security-policy']).toContain("object-src 'none'");
    });

    it("sets frame-ancestors to 'none'", () => {
      expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    });

    it('does NOT include overly permissive https: in img-src', () => {
      const csp = response.headers['content-security-policy'];
      const imgSrc = csp.match(/img-src[^;]*/)?.[0] || '';
      expect(imgSrc).not.toContain('https:');
    });
  });

  // --- Nonce uniqueness ---

  describe('Nonce', () => {
    it('generates a nonce in res.locals', () => {
      expect(response.body.nonce).toBeDefined();
      expect(response.body.nonce.length).toBeGreaterThan(0);
    });

    it('generates a different nonce per request', async () => {
      const app = createApp();
      const res1 = await request(app).get('/test');
      const res2 = await request(app).get('/test');
      expect(res1.body.nonce).not.toBe(res2.body.nonce);
    });
  });

  // --- Other Helmet headers ---

  describe('Helmet defaults', () => {
    it('sets X-Frame-Options to DENY', () => {
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('sets X-Content-Type-Options to nosniff', () => {
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('sets Referrer-Policy', () => {
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('removes X-Powered-By', () => {
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('sets Cross-Origin-Opener-Policy', () => {
      expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
    });

    it('sets Strict-Transport-Security (HSTS)', () => {
      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    });
  });
});
