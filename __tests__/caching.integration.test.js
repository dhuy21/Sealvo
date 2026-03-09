/**
 * Integration tests: Phase 2 — Caching Strategy (Redis).
 *
 * Tests run against the real Express app (via supertest) with mocked DB.
 * Redis is NOT connected in test env → MemoryStore fallback for rate limiting.
 *
 * Covers:
 *   - /health endpoint reports redis status
 *   - Rate limiting (CRON_SECRET protection)
 *   - Game score route existence
 *   - Feedback rate limiting route
 *   - Auth protection on sensitive endpoints
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const request = require('supertest');
const { getApp } = require('../appFactory');

describe('Phase 2 — Caching integration', () => {
  let app;

  beforeAll(() => {
    global.dbConnection = {
      execute: jest.fn().mockResolvedValue([[]]),
      end: jest.fn().mockResolvedValue(undefined),
    };
    app = getApp();
  });

  // ── Health check ────────────────────────────────────────────
  describe('GET /health', () => {
    it('reports redis field (false in test env, since Redis is not connected)', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          ok: true,
          db: true,
          redis: false,
        })
      );
    });

    it('returns 200 even when Redis is down (DB is the only critical dependency)', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  // ── CRON_SECRET protection ──────────────────────────────────
  describe('POST /api/reminder — CRON_SECRET', () => {
    const originalSecret = process.env.CRON_SECRET;

    afterEach(() => {
      if (originalSecret !== undefined) {
        process.env.CRON_SECRET = originalSecret;
      } else {
        delete process.env.CRON_SECRET;
      }
    });

    it('returns 503 when CRON_SECRET is not configured', async () => {
      delete process.env.CRON_SECRET;
      const res = await request(app).post('/api/reminder').send({});
      expect(res.status).toBe(503);
      expect(res.body).toHaveProperty('success', false);
    });

    it('returns 403 when X-Cron-Secret header is missing', async () => {
      process.env.CRON_SECRET = 'test-secret-123';
      const res = await request(app).post('/api/reminder').send({});
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });

    it('returns 403 when X-Cron-Secret header is wrong', async () => {
      process.env.CRON_SECRET = 'test-secret-123';
      const res = await request(app)
        .post('/api/reminder')
        .set('X-Cron-Secret', 'wrong-secret')
        .send({});
      expect(res.status).toBe(403);
    });
  });

  // ── TTS auth protection ─────────────────────────────────────
  describe('POST /api/tts/generate — authentication', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/tts/generate')
        .send({ text: 'hello', language: 'fr' });
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ── Game score route ────────────────────────────────────────
  describe('POST /games/score — authentication', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/games/score')
        .send({ game_type: 'word_scramble', score: 100 });
      expect(res.status).toBe(401);
    });
  });

  // ── Email endpoint auth ─────────────────────────────────────
  describe('POST /api/testEmail — authentication', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).post('/api/testEmail').send({});
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ── Streak update auth ─────────────────────────────────────
  describe('POST /update-streak — authentication', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).post('/update-streak').send({});
      expect(res.status).toBe(401);
    });
  });
});
