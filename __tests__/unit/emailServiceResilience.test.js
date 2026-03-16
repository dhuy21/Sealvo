/**
 * Tests: MailersendService — resilience integration (retry, timeout, fallback).
 * Mocks nodemailer transporter at the library level to test the REAL
 * resilience wrapping + graceful degradation (return false).
 */
const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: mockSendMail,
  }),
}));

jest.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: jest.fn().mockImplementation(() => ({})),
  SendEmailCommand: jest.fn(),
}));

process.env.AWS_REGION = 'eu-west-1';
process.env.AWS_ACCESS_KEY_ID = 'fake-key';
process.env.AWS_SECRET_ACCESS_KEY = 'fake-secret';
process.env.AWS_SES_FROM = 'test@example.com';

let mailersend;

beforeAll(() => {
  jest.isolateModules(() => {
    mailersend = require('../../app/services/mailersend');
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore();
  console.error.mockRestore();
});

function netError(msg, code) {
  const e = new Error(msg);
  e.code = code;
  return e;
}

// ---------------------------------------------------------------------------
// Retry behavior
// ---------------------------------------------------------------------------
describe('MailersendService — retry', () => {
  it('retries on transient SES failure and succeeds', async () => {
    mockSendMail
      .mockRejectedValueOnce(netError('Throttling', 'ECONNRESET'))
      .mockResolvedValueOnce({ messageId: 'msg-123' });

    const result = await mailersend.sendEmail('user@test.com', '<p>Hello</p>');
    expect(result).toEqual({ messageId: 'msg-123' });
    expect(mockSendMail).toHaveBeenCalledTimes(2);
  });

  it('retries up to 3 attempts total (1 + 2 retries)', async () => {
    mockSendMail
      .mockRejectedValueOnce(netError('Throttling', 'ETIMEDOUT'))
      .mockRejectedValueOnce(netError('Throttling', 'ETIMEDOUT'))
      .mockResolvedValueOnce({ messageId: 'msg-456' });

    const result = await mailersend.sendEmail('user@test.com', '<p>Hello</p>');
    expect(result).toEqual({ messageId: 'msg-456' });
    expect(mockSendMail).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// Smart retry — non-transient errors skip retry (Phase 5)
// ---------------------------------------------------------------------------
describe('MailersendService — smart retry (Phase 5)', () => {
  it('does NOT retry on non-transient error (no network code) — fails immediately to false', async () => {
    mockSendMail.mockRejectedValue(new Error('MessageRejected: Email address not verified'));

    const result = await mailersend.sendEmail('bad@test.com', '<p>Hello</p>');
    expect(result).toBe(false);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Graceful degradation
// ---------------------------------------------------------------------------
describe('MailersendService — graceful degradation', () => {
  it('returns false when all retries fail (no crash)', async () => {
    mockSendMail.mockRejectedValue(netError('SES_UNAVAILABLE', 'ECONNREFUSED'));

    const result = await mailersend.sendEmail('user@test.com', '<p>Hello</p>');
    expect(result).toBe(false);
    expect(mockSendMail).toHaveBeenCalledTimes(3);
  });

  it('logs the error on failure', async () => {
    mockSendMail.mockRejectedValue(netError('CONNECTION_REFUSED', 'ECONNREFUSED'));

    await mailersend.sendEmail('user@test.com', '<p>Hello</p>');
    expect(console.error).toHaveBeenCalledWith(
      "Erreur lors de l'envoi de l'email:",
      expect.any(Error)
    );
  });
});
