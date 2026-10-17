import { testMailConfig } from '../config/testing.js';
import { EmailService } from './email.service.js';

describe('EmailService.sendEmail', () => {
  let service: EmailService;
  let sendMail: any;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new EmailService(testMailConfig());
    sendMail = vi.fn();
    (service as any).transporter = { sendMail };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries a transient error', async () => {
    sendMail
      .mockRejectedValueOnce(
        Object.assign(new Error('reset'), { code: 'ECONNRESET' }),
      )
      .mockResolvedValueOnce({ messageId: 'm1' });

    const result = service.sendEmail('a@test.com', '<p>hi</p>', 'S', {
      retries: 2,
    });
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('never resends after a timeout and reports the email as possibly sent', async () => {
    sendMail.mockReturnValue(new Promise(() => {}));

    const result = service.sendEmail('a@test.com', '<p>hi</p>', 'S', {
      retries: 2,
    });
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('returns false on a non-transient error', async () => {
    sendMail.mockRejectedValue(new Error('rejected'));

    const result = service.sendEmail('a@test.com', '<p>hi</p>', 'S', {
      retries: 2,
    });
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe(false);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});

describe('EmailService.compileTemplate', () => {
  const service = new EmailService(testMailConfig());

  it.each([
    ['mailVerification.hbs', 1],
    ['mailResetPassword.hbs', 2],
  ])('%s states the link lifetime it is given', (template, occurrences) => {
    const html = service.compileTemplate(template, { username: 'ann', expiresIn: '42 minutes' });

    expect(html.split('42 minutes')).toHaveLength(occurrences + 1);
    expect(html).not.toMatch(/\d+ heures?\b/);
  });
});
