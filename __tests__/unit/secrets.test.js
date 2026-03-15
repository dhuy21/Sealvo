const { validateSecrets } = require('../../app/config/secrets');

jest.mock('../../app/config/environment', () => ({
  isProductionLike: jest.fn(),
}));

const { isProductionLike } = require('../../app/config/environment');

const VALID_SESSION_SECRET = 'a'.repeat(32);
const VALID_CRON_SECRET = 'b'.repeat(16);

describe('validateSecrets (unit)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(process, 'exit').mockImplementation();
    isProductionLike.mockReturnValue(false);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('does nothing when all secrets are valid', () => {
    process.env.SESSION_SECRET = VALID_SESSION_SECRET;
    process.env.CRON_SECRET = VALID_CRON_SECRET;

    validateSecrets();

    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('warns in development when SESSION_SECRET is missing', () => {
    delete process.env.SESSION_SECRET;
    process.env.CRON_SECRET = VALID_CRON_SECRET;

    validateSecrets();

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('SESSION_SECRET'));
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('warns in development when CRON_SECRET is too short', () => {
    process.env.SESSION_SECRET = VALID_SESSION_SECRET;
    process.env.CRON_SECRET = 'short';

    validateSecrets();

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('CRON_SECRET'));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('too short'));
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('calls process.exit(1) in production when secrets are missing', () => {
    isProductionLike.mockReturnValue(true);
    delete process.env.SESSION_SECRET;
    delete process.env.CRON_SECRET;

    validateSecrets();

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('SESSION_SECRET'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('reports all failing secrets in a single banner', () => {
    delete process.env.SESSION_SECRET;
    delete process.env.CRON_SECRET;

    validateSecrets();

    const message = console.warn.mock.calls[0][0];
    expect(message).toContain('SESSION_SECRET');
    expect(message).toContain('CRON_SECRET');
  });
});
