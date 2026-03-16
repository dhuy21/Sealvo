/**
 * Unit tests: errorHandler middleware + expectsJson heuristic
 */
const errorHandler = require('../../app/middleware/errorHandler');
const {
  AppError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  TooManyRequestsError,
} = require('../../app/errors/AppError');

// --------------- helpers ---------------

function mockReq(overrides = {}) {
  return {
    path: '/',
    method: 'GET',
    xhr: false,
    headers: {},
    originalUrl: '/',
    session: {},
    ...overrides,
  };
}

function mockRes() {
  const res = {
    headersSent: false,
    statusCode: null,
    body: null,
    renderArgs: null,
  };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body) => {
    res.body = body;
    return res;
  });
  res.render = jest.fn((view, data) => {
    res.renderArgs = { view, data };
    return res;
  });
  return res;
}

// --------------- expectsJson heuristic ---------------

describe('expectsJson detection', () => {
  const next = jest.fn();
  const err = new ValidationError('test');

  beforeEach(() => next.mockClear());

  function callHandler(req) {
    const res = mockRes();
    errorHandler(err, req, res, next);
    return res;
  }

  it('/api/ prefix → JSON', () => {
    const res = callHandler(mockReq({ path: '/api/words' }));
    expect(res.json).toHaveBeenCalled();
    expect(res.render).not.toHaveBeenCalled();
  });

  it('req.xhr = true → JSON', () => {
    const res = callHandler(mockReq({ xhr: true }));
    expect(res.json).toHaveBeenCalled();
  });

  it('Accept: application/json → JSON', () => {
    const res = callHandler(mockReq({ headers: { accept: 'application/json' } }));
    expect(res.json).toHaveBeenCalled();
  });

  it('Content-Type: application/json → JSON', () => {
    const res = callHandler(mockReq({ headers: { 'content-type': 'application/json' } }));
    expect(res.json).toHaveBeenCalled();
  });

  it('POST with Accept: */* (fetch default) → JSON', () => {
    const res = callHandler(mockReq({ method: 'POST', headers: { accept: '*/*' } }));
    expect(res.json).toHaveBeenCalled();
  });

  it('GET with Accept: */* → HTML', () => {
    const res = callHandler(mockReq({ method: 'GET', headers: { accept: '*/*' } }));
    expect(res.render).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('POST with Accept: text/html → HTML', () => {
    const res = callHandler(mockReq({ method: 'POST', headers: { accept: 'text/html, */*' } }));
    expect(res.render).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

// --------------- errorHandler — JSON branch ---------------

describe('errorHandler — JSON branch', () => {
  const jsonReq = mockReq({ path: '/api/test' });
  const next = jest.fn();

  it('ValidationError → 400 + { success: false }', () => {
    const res = mockRes();
    errorHandler(new ValidationError('champ requis'), jsonReq, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toMatchObject({ success: false, message: 'champ requis' });
  });

  it('NotFoundError → 404', () => {
    const res = mockRes();
    errorHandler(new NotFoundError('introuvable'), jsonReq, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body.success).toBe(false);
  });

  it('ForbiddenError → 403', () => {
    const res = mockRes();
    errorHandler(new ForbiddenError(), jsonReq, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('UnauthorizedError → 401', () => {
    const res = mockRes();
    errorHandler(new UnauthorizedError(), jsonReq, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('TooManyRequestsError → 429', () => {
    const res = mockRes();
    errorHandler(new TooManyRequestsError('Trop de tentatives'), jsonReq, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.body).toMatchObject({ success: false, message: 'Trop de tentatives' });
  });

  it('non-operational Error → 500 + generic message', () => {
    const res = mockRes();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(new Error('db crash'), jsonReq, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body.message).toBe('Une erreur interne est survenue. Veuillez réessayer plus tard.');
    spy.mockRestore();
  });

  it('includes err.details when present', () => {
    const res = mockRes();
    const err = new ValidationError('bad', [{ field: 'email' }]);
    errorHandler(err, jsonReq, res, next);
    expect(res.body.details).toEqual([{ field: 'email' }]);
  });

  it('includes stack in development for non-operational error', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const res = mockRes();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(new Error('dev boom'), jsonReq, res, next);
    expect(res.body.stack).toBeDefined();
    spy.mockRestore();
    process.env.NODE_ENV = prev;
  });

  it('hides stack in production for non-operational error', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const res = mockRes();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(new Error('prod boom'), jsonReq, res, next);
    expect(res.body.stack).toBeUndefined();
    spy.mockRestore();
    process.env.NODE_ENV = prev;
  });
});

// --------------- errorHandler — HTML branch ---------------

describe('errorHandler — HTML branch', () => {
  const htmlReq = mockReq({
    method: 'GET',
    headers: { accept: 'text/html' },
  });
  const next = jest.fn();

  it('renders error template with correct data', () => {
    const res = mockRes();
    errorHandler(new NotFoundError('page introuvable'), htmlReq, res, next);
    expect(res.render).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({
        title: 'Erreur',
        message: 'page introuvable',
      })
    );
  });

  it('passes stack in development', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const res = mockRes();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('dev html boom');
    errorHandler(err, htmlReq, res, next);
    const renderData = res.render.mock.calls[0][1];
    expect(renderData.error).toBeDefined();
    expect(renderData.error).toContain('dev html boom');
    spy.mockRestore();
    process.env.NODE_ENV = prev;
  });

  it('passes null in production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const res = mockRes();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(new Error('prod html boom'), htmlReq, res, next);
    const renderData = res.render.mock.calls[0][1];
    expect(renderData.error).toBeNull();
    spy.mockRestore();
    process.env.NODE_ENV = prev;
  });
});

// --------------- infrastructure errors (Phase 5 — contrat HTTP) ---------------

describe('errorHandler — infrastructure errors', () => {
  const { TimeoutError, CircuitOpenError } = require('../../app/core/resilience');
  const jsonReq = mockReq({ path: '/api/test' });
  const next = jest.fn();

  it('TimeoutError → 504 Gateway Timeout', () => {
    const res = mockRes();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(new TimeoutError(5000), jsonReq, res, next);
    expect(res.status).toHaveBeenCalledWith(504);
    expect(res.body.message).toBe('Le service externe ne répond pas. Veuillez réessayer.');
    spy.mockRestore();
  });

  it('CircuitOpenError → 503 Service Unavailable', () => {
    const res = mockRes();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(new CircuitOpenError('google-tts'), jsonReq, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.body.message).toBe(
      'Service temporairement indisponible. Veuillez réessayer dans quelques instants.'
    );
    spy.mockRestore();
  });

  it('logs infrastructure errors with err.name context', () => {
    const res = mockRes();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const err = new CircuitOpenError('gemini');
    errorHandler(err, jsonReq, res, next);
    expect(spy).toHaveBeenCalledWith(
      '[ErrorHandler] Infrastructure error (CircuitOpenError):',
      err.message
    );
    spy.mockRestore();
  });

  it('hides internal details from client (no circuit name in response)', () => {
    const res = mockRes();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(new CircuitOpenError('google-tts'), jsonReq, res, next);
    expect(res.body.message).not.toContain('google-tts');
    expect(res.body.message).not.toContain('Circuit');
    spy.mockRestore();
  });

  it('includes stack in development mode', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const res = mockRes();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(new TimeoutError(5000), jsonReq, res, next);
    expect(res.body.stack).toBeDefined();
    spy.mockRestore();
    process.env.NODE_ENV = prev;
  });
});

// --------------- edge cases ---------------

describe('errorHandler — edge cases', () => {
  it('delegates to next(err) when headers already sent', () => {
    const res = mockRes();
    res.headersSent = true;
    const next = jest.fn();
    const err = new Error('late');
    errorHandler(err, mockReq(), res, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});
