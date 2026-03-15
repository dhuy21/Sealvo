const { csrfTokenMiddleware, csrfVerifyMiddleware } = require('../../app/middleware/csrf');

jest.mock('../../app/config/environment', () => ({
  isProductionLike: jest.fn().mockReturnValue(false),
}));

function mockReq(overrides = {}) {
  return {
    method: 'GET',
    path: '/',
    headers: {},
    body: {},
    ...overrides,
  };
}

function mockRes() {
  const res = { locals: {} };
  res.cookie = jest.fn();
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// ---------- csrfTokenMiddleware ----------

describe('csrfTokenMiddleware', () => {
  it('generates a new token when no cookie exists', () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    csrfTokenMiddleware(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      '__csrf',
      expect.any(String),
      expect.objectContaining({ httpOnly: false, sameSite: 'lax', path: '/' })
    );
    expect(res.locals.csrfToken).toHaveLength(64);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('reuses existing token from cookie (does not set a new cookie)', () => {
    const existingToken = 'a'.repeat(64);
    const req = mockReq({ headers: { cookie: `__csrf=${existingToken}` } });
    const res = mockRes();
    const next = jest.fn();

    csrfTokenMiddleware(req, res, next);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.locals.csrfToken).toBe(existingToken);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a new token when cookie is malformed (URIError)', () => {
    const req = mockReq({ headers: { cookie: '__csrf=%ZZinvalid' } });
    const res = mockRes();
    const next = jest.fn();

    csrfTokenMiddleware(req, res, next);

    expect(res.cookie).toHaveBeenCalled();
    expect(res.locals.csrfToken).toHaveLength(64);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

// ---------- csrfVerifyMiddleware ----------

describe('csrfVerifyMiddleware', () => {
  const savedNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.NODE_ENV = savedNodeEnv;
  });

  // --- Safe methods ---

  it.each(['GET', 'HEAD', 'OPTIONS'])('allows %s requests without verification', (method) => {
    const req = mockReq({ method });
    const res = mockRes();
    const next = jest.fn();

    csrfVerifyMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // --- Excluded paths ---

  it.each(['/health', '/health/deps', '/api/reminder'])(
    'allows POST to excluded path %s',
    (path) => {
      const req = mockReq({ method: 'POST', path });
      const res = mockRes();
      const next = jest.fn();

      csrfVerifyMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    }
  );

  // --- Test environment bypass ---

  it('bypasses verification when NODE_ENV=test', () => {
    process.env.NODE_ENV = 'test';
    const req = mockReq({ method: 'POST', path: '/login' });
    const res = mockRes();
    const next = jest.fn();

    csrfVerifyMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  // --- Rejection scenarios ---

  it('returns 403 when no CSRF token is submitted', () => {
    const token = 'a'.repeat(64);
    const req = mockReq({
      method: 'POST',
      path: '/login',
      headers: { cookie: `__csrf=${token}` },
    });
    const res = mockRes();
    const next = jest.fn();

    csrfVerifyMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('CSRF') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when no CSRF cookie is present', () => {
    const req = mockReq({
      method: 'POST',
      path: '/login',
      headers: { 'x-csrf-token': 'sometoken' },
    });
    const res = mockRes();
    const next = jest.fn();

    csrfVerifyMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when tokens do not match', () => {
    const req = mockReq({
      method: 'POST',
      path: '/login',
      headers: {
        cookie: `__csrf=${'a'.repeat(64)}`,
        'x-csrf-token': 'b'.repeat(64),
      },
    });
    const res = mockRes();
    const next = jest.fn();

    csrfVerifyMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  // --- Success scenarios ---

  it('allows POST when header token matches cookie token', () => {
    const token = 'c'.repeat(64);
    const req = mockReq({
      method: 'POST',
      path: '/login',
      headers: {
        cookie: `__csrf=${token}`,
        'x-csrf-token': token,
      },
    });
    const res = mockRes();
    const next = jest.fn();

    csrfVerifyMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows POST when body _csrf field matches cookie token', () => {
    const token = 'd'.repeat(64);
    const req = mockReq({
      method: 'POST',
      path: '/registre',
      headers: { cookie: `__csrf=${token}` },
      body: { _csrf: token },
    });
    const res = mockRes();
    const next = jest.fn();

    csrfVerifyMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows PUT when header token matches cookie token', () => {
    const token = 'e'.repeat(64);
    const req = mockReq({
      method: 'PUT',
      path: '/myPackages/edit/1',
      headers: {
        cookie: `__csrf=${token}`,
        'x-csrf-token': token,
      },
    });
    const res = mockRes();
    const next = jest.fn();

    csrfVerifyMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
