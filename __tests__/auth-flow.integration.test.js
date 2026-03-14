/**
 * Integration tests: forgot password, reset password, email verification.
 *
 * Routes (from app/routes/user/login.js and app/routes/auth/email_verification.js):
 *   POST /login/forgotPassword    → ResetPasswordController.forgotPasswordPost
 *   GET  /login/resetPassword     → ResetPasswordController.resetPassword (render)
 *   POST /login/resetPassword     → ResetPasswordController.resetPasswordPost
 *   GET  /auth/verify/:token      → EmailVerificationController.verifyEmail
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const request = require('supertest');
const { getApp } = require('../appFactory');

describe('Auth flow (integration)', () => {
  let app;

  beforeAll(() => {
    global.dbConnection = {
      execute: jest.fn().mockResolvedValue([[]]),
      end: jest.fn().mockResolvedValue(undefined),
    };
    app = getApp();
  });

  // ── Forgot password ─────────────────────────────────────────
  describe('POST /login/forgotPassword', () => {
    it('returns 400 when email is not registered (DB returns no user)', async () => {
      const res = await request(app)
        .post('/login/forgotPassword')
        .send({ email: 'nobody@example.com' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/email/i);
    });
  });

  // ── Reset password page ─────────────────────────────────────
  describe('GET /login/resetPassword', () => {
    it('returns 200 and renders the reset password form', async () => {
      const res = await request(app).get('/login/resetPassword?token=abc123');

      expect(res.status).toBe(200);
      expect(res.text).toMatch(/réinitialiser|reset|password/i);
    });
  });

  // ── Reset password submission ───────────────────────────────
  describe('POST /login/resetPassword', () => {
    it('returns 400 with validation details when passwords do not match', async () => {
      const res = await request(app).post('/login/resetPassword').send({
        token: 'tok',
        password: 'pass1!longer',
        confirm_password: 'pass2!different',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'confirm_password',
            message: expect.stringMatching(/correspondent/),
          }),
        ])
      );
    });

    it('returns 400 when token is not found in DB', async () => {
      // Mock DB returns [] → findByToken returns undefined → "token not valid"
      const res = await request(app).post('/login/resetPassword').send({
        token: 'invalid-token-xyz',
        password: 'Pass123!',
        confirm_password: 'Pass123!',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/valide/i);
    });
  });

  // ── Email verification ──────────────────────────────────────
  describe('GET /auth/verify/:token', () => {
    it('redirects to /login when token is invalid (DB returns no record)', async () => {
      const res = await request(app).get('/auth/verify/invalid-token-xyz');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login');
    });
  });
});
