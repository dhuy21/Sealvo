/**
 * Tests: routes site public (accueil, aboutme, feedback).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const request = require('supertest');
const { getApp } = require('../appFactory');

describe('Site routes (integration)', () => {
  let app;

  beforeAll(() => {
    global.dbConnection = {
      execute: jest.fn().mockResolvedValue([[]]),
      end: jest.fn().mockResolvedValue(undefined),
    };
    app = getApp();
  });

  describe('GET /', () => {
    it('returns 200 and home page', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toMatch(/Accueil|accueil|home/i);
    });
  });

  describe('GET /aboutme', () => {
    it('returns 200 and about page', async () => {
      const res = await request(app).get('/aboutme');
      expect(res.status).toBe(200);
      expect(res.text).toMatch(/propos|about|moi/i);
    });
  });

  describe('GET /feedback', () => {
    it('returns 200 and feedback page', async () => {
      const res = await request(app).get('/feedback');
      expect(res.status).toBe(200);
      expect(res.text).toMatch(/feedback|envoyer|sujet/i);
    });
  });

  describe('POST /feedback', () => {
    it('returns 400 when required fields are missing', async () => {
      const res = await request(app).post('/feedback').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/champs obligatoires|remplir/i);
    });

    it('returns 400 when only some fields are sent', async () => {
      const res = await request(app).post('/feedback').send({ type: 'bug' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('Unknown route', () => {
    it('GET /nonexistent returns 404', async () => {
      const res = await request(app).get('/nonexistent-page-xyz');
      expect(res.status).toBe(404);
    });
  });
});
