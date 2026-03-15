/**
 * Integration tests: Game score system
 *
 * Tests the full HTTP request cycle through Express middleware:
 *   Part A — POST /games/score (validation + auth)
 *   Part B — GET /games (removed page → 404)
 *   Part C — GET /games/:gameType (auth required)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const request = require('supertest');
const { getApp } = require('../appFactory');

describe('Game score system (integration)', () => {
  let app;

  beforeAll(() => {
    global.dbConnection = {
      execute: jest.fn().mockResolvedValue([[]]),
      end: jest.fn().mockResolvedValue(undefined),
    };
    app = getApp();
  });

  // ── Part A: POST /games/score — auth required ───────────────────

  describe('POST /games/score — authentication', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/games/score')
        .send({ game_type: 'word_scramble', score: 100 });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ── Part B: GET /games — removed page ───────────────────────────

  describe('GET /games — removed index page', () => {
    it('returns 302 redirect (auth middleware) or 404 (no route)', async () => {
      const res = await request(app).get('/games');

      // Without auth → redirect. With auth → no handler → falls through.
      // Either way, it should NOT return 200 with a rendered page.
      expect(res.status).not.toBe(200);
    });

    it('does NOT render a game index template', async () => {
      const res = await request(app).get('/games');

      expect(res.text).not.toMatch(/Jeux éducatifs/);
    });
  });

  // ── Part C: GET /games/:gameType — auth required ────────────────

  describe('GET /games/:gameType — authentication', () => {
    it('redirects to /login when not authenticated', async () => {
      const res = await request(app).get('/games/wordScramble?package=1');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login');
    });
  });

  // ── Part D: POST /games/score — validation ──────────────────────

  describe('POST /games/score — input validation (unauthenticated)', () => {
    it('rejects request without auth before validation runs', async () => {
      const res = await request(app)
        .post('/games/score')
        .send({ game_type: 'invalid_type', score: -1 });

      expect(res.status).toBe(401);
    });
  });
});
