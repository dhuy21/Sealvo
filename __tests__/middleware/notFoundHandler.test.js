/**
 * Unit tests: notFoundHandler middleware
 */
const notFoundHandler = require('../../app/middleware/notFoundHandler');
const { NotFoundError } = require('../../app/errors/AppError');

describe('notFoundHandler (unit)', () => {
  it('calls next with a NotFoundError', () => {
    const req = { method: 'GET', originalUrl: '/unknown-route' };
    const res = {};
    const next = jest.fn();

    notFoundHandler(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.statusCode).toBe(404);
  });

  it('includes method and URL in the error message', () => {
    const req = { method: 'POST', originalUrl: '/api/v2/missing' };
    const res = {};
    const next = jest.fn();

    notFoundHandler(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.message).toContain('POST');
    expect(err.message).toContain('/api/v2/missing');
  });
});
