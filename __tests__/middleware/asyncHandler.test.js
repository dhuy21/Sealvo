/**
 * Unit tests: asyncHandler middleware wrapper
 */
const asyncHandler = require('../../app/middleware/asyncHandler');

describe('asyncHandler (unit)', () => {
  const req = {};
  const res = {};

  it('does not call next when the handler resolves', async () => {
    const next = jest.fn();
    const handler = asyncHandler(async () => {});
    await handler(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not call next when the handler returns synchronously', async () => {
    const next = jest.fn();
    const handler = asyncHandler(() => {});
    await handler(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next(err) when the handler rejects', async () => {
    const error = new Error('async boom');
    const next = jest.fn();
    const handler = asyncHandler(async () => {
      throw error;
    });
    await handler(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
  });

  it('lets synchronous throws propagate (Express catches these natively)', () => {
    const error = new Error('sync boom');
    const next = jest.fn();
    const handler = asyncHandler(() => {
      throw error;
    });
    expect(() => handler(req, res, next)).toThrow(error);
  });

  it('forwards req, res, next to the wrapped handler', async () => {
    const spy = jest.fn();
    const next = jest.fn();
    const handler = asyncHandler(spy);
    await handler(req, res, next);
    expect(spy).toHaveBeenCalledWith(req, res, next);
  });
});
