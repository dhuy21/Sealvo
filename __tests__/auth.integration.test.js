/**
 * Cấu trúc chuẩn một file integration test:
 *
 * 1. Setup: load env, require supertest + getApp
 * 2. describe('Nhóm chính') → toàn bộ test của file
 * 3. beforeAll() → chuẩn bị chung 1 lần (mock DB, tạo app)
 * 4. describe('GET /route') / describe('POST /route') → nhóm theo từng route hoặc hành vi
 * 5. it('mô tả kịch bản', async () => { request(app).get/post(...); expect(...) })
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const request = require('supertest');
const { getApp } = require('../appFactory');

describe('Auth routes (integration)', () => {
  let app;

  beforeAll(() => {
    // Mock DB so controllers that touch DB don't crash (e.g. POST /login)
    global.dbConnection = {
      execute: jest.fn().mockResolvedValue([[]]),
      end: jest.fn().mockResolvedValue(undefined),
    };
    app = getApp();
  });

  describe('GET /login', () => {
    it('returns 200 and login page', async () => {
      const res = await request(app).get('/login');
      expect(res.status).toBe(200);
      expect(res.text).toMatch(/Connexion|login/i);
    });
  });

  describe('GET /login/forgotPassword', () => {
    it('returns 200 and forgot password page', async () => {
      const res = await request(app).get('/login/forgotPassword');
      expect(res.status).toBe(200);
      expect(res.text).toMatch(/mot de passe|forgot|email/i);
    });
  });

  describe('GET /registre', () => {
    it('returns 200 and registration page', async () => {
      const res = await request(app).get('/registre');
      expect(res.status).toBe(200);
      expect(res.text).toMatch(/Inscription|registre|inscri/i);
    });
  });

  describe('POST /login', () => {
    it('returns 400 when username and password are missing', async () => {
      const res = await request(app).post('/login').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/champs|remplir/i);
    });

    it('returns 400 when user does not exist (mock DB returns no row)', async () => {
      const res = await request(app)
        .post('/login')
        .send({ username: 'nonexistent', password: 'any' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/incorrect|utilisateur|mot de passe/i);
    });
  });

  describe('POST /registre', () => {
    it('returns 400 when required fields are missing', async () => {
      const res = await request(app).post('/registre').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/champs|remplir/i);
    });

    it('returns 400 when passwords do not match', async () => {
      const res = await request(app).post('/registre').send({
        username: 'newuser',
        email: 'new@example.com',
        password: 'secret12',
        password2: 'different',
      });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/mots de passe|correspondent/i);
    });

    it('returns 400 when password is too short', async () => {
      const res = await request(app).post('/registre').send({
        username: 'newuser',
        email: 'new@example.com',
        password: 'short',
        password2: 'short',
      });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/6 caractères|au moins/i);
    });
  });

  describe('GET /logout', () => {
    it('redirects to home or login', async () => {
      const res = await request(app).get('/logout');
      expect([302, 303]).toContain(res.status);
      expect(res.headers.location).toBeDefined();
    });
  });
});
