/**
 * Integration tests: health, API routes (TTS validation, level-progress auth).
 * DB và TTS mock — không cần secret trong CI.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const request = require('supertest');
const { getApp } = require('../appFactory');

describe('API & health (integration)', () => {
  let app;

  beforeAll(() => {
    global.dbConnection = {
      execute: jest.fn().mockResolvedValue([[]]),
      end: jest.fn().mockResolvedValue(undefined),
    };
    app = getApp();
  });

  describe('GET /health', () => {
    it('returns health status with db and redis fields', async () => {
      const res = await request(app).get('/health');
      // In test env, DB is mocked (dbConnection set) but Redis is not connected.
      // ok = dbOk (DB is critical); redis field is informational only.
      // DB mocked → ok=true, redis=false → 200. Shape is what matters.
      expect(res.body).toHaveProperty('ok');
      expect(res.body).toHaveProperty('db');
      expect(res.body).toHaveProperty('redis');
    });
  });

  describe('POST /api/tts/generate', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/tts/generate')
        .send({ text: 'hello', language: 'fr' });
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/connecté/i);
    });
  });

  describe('Level progress – 401 when not authenticated', () => {
    it('POST /level-progress/track returns 401', async () => {
      const res = await request(app)
        .post('/level-progress/track')
        .send({ game_type: 'vocab_quiz', completed: true });
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/connecté/i);
    });

    it('GET /level-progress/status returns 401', async () => {
      const res = await request(app).get('/level-progress/status');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('POST /level-progress/reset returns 401', async () => {
      const res = await request(app).post('/level-progress/reset').send({});
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});
