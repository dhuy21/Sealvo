/**
 * Tests: routes protégées (isAuthenticated / isAuthenticatedAPI)
 * Sans session → redirect vers /login (pages) ou 401 JSON (API).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const request = require('supertest');
const { getApp } = require('../appFactory');

describe('Protected routes (integration)', () => {
  let app;

  beforeAll(() => {
    global.dbConnection = {
      execute: jest.fn().mockResolvedValue([[]]),
      end: jest.fn().mockResolvedValue(undefined),
    };
    app = getApp();
  });

  describe('Page routes – redirect to /login when not authenticated', () => {
    it.each([['/dashboard'], ['/monVocabs'], ['/myPackages']])(
      'GET %s redirects to /login',
      async (path) => {
        const res = await request(app).get(path);
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/login');
      }
    );
  });

  describe('API routes – 401 when not authenticated', () => {
    it('POST /update-streak returns 401', async () => {
      const res = await request(app).post('/update-streak').send({});
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toMatch(/connecté/i);
    });
  });
});
