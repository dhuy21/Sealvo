/**
 * Integration tests: health, API routes (TTS validation, level-progress auth).
 * DB và TTS mock — không cần secret trong CI.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../app/config/.env') });

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
    it('returns 200 and { ok: true }', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe('POST /api/tts/generate', () => {
    it('returns 400 when text is missing', async () => {
      const res = await request(app).post('/api/tts/generate').send({ language: 'fr' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/texte|requis/i);
    });

    it('returns 400 when language is missing', async () => {
      const res = await request(app).post('/api/tts/generate').send({ text: 'hello' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/langue|requise/i);
    });

    it('returns 400 when body is empty', async () => {
      const res = await request(app).post('/api/tts/generate').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
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
