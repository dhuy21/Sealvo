/**
 * Tests: emailQueue.js — dedup via cache.setNX (Phase 5).
 * Verifies that duplicate messageIds are skipped and that
 * the dedup mechanism degrades gracefully when Redis is down.
 */
const mockSendEmail = jest.fn();
const mockSetNX = jest.fn();
const mockRedisReady = jest.fn().mockReturnValue(true);

jest.mock('../../app/core/rabbitmq', () => ({
  getChannel: jest.fn(),
}));

jest.mock('../../app/core/redis', () => ({
  isReady: (...args) => mockRedisReady(...args),
}));

jest.mock('../../app/core/cache', () => ({
  setNX: (...args) => mockSetNX(...args),
}));

jest.mock('../../app/services/mailersend', () => ({
  sendEmail: (...args) => mockSendEmail(...args),
}));

const rabbitmq = require('../../app/core/rabbitmq');

let emailQueue;

beforeAll(() => {
  jest.isolateModules(() => {
    emailQueue = require('../../app/queues/emailQueue');
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRedisReady.mockReturnValue(true);
});

function buildMsg(payload, messageId) {
  return {
    content: Buffer.from(JSON.stringify(payload)),
    properties: {
      messageId,
      headers: {},
    },
  };
}

describe('emailQueue — publish', () => {
  it('attaches a UUID messageId to published messages', () => {
    const published = [];
    const mockChannel = {
      publish: jest.fn((_ex, _rk, _buf, opts) => published.push(opts)),
    };
    rabbitmq.getChannel.mockReturnValue(mockChannel);

    emailQueue.publish({ to: 'a@b.com', content: '<p>hi</p>' });

    expect(published[0].messageId).toBeDefined();
    expect(typeof published[0].messageId).toBe('string');
    expect(published[0].messageId.length).toBeGreaterThan(10);
  });

  it('generates unique messageIds per call', () => {
    const ids = [];
    const mockChannel = {
      publish: jest.fn((_ex, _rk, _buf, opts) => ids.push(opts.messageId)),
    };
    rabbitmq.getChannel.mockReturnValue(mockChannel);

    emailQueue.publish({ to: 'a@b.com', content: '1' });
    emailQueue.publish({ to: 'a@b.com', content: '2' });

    expect(ids[0]).not.toBe(ids[1]);
  });
});

describe('emailQueue — consumer dedup', () => {
  let consumeCallback;

  beforeEach(async () => {
    const mockChannel = {
      assertExchange: jest.fn().mockResolvedValue(),
      assertQueue: jest.fn().mockResolvedValue(),
      bindQueue: jest.fn().mockResolvedValue(),
      consume: jest.fn((_q, cb) => {
        consumeCallback = cb;
        return Promise.resolve();
      }),
      ack: jest.fn(),
      nack: jest.fn(),
      sendToQueue: jest.fn(),
    };
    rabbitmq.getChannel.mockReturnValue(mockChannel);

    await emailQueue.setupTopology();
    await emailQueue.startConsumer();
  });

  it('skips duplicate message (setNX returns false) and acks', async () => {
    mockSetNX.mockResolvedValue(false);
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const msg = buildMsg({ to: 'a@b.com', content: '<p>hi</p>' }, 'dup-uuid-1');
    await consumeCallback(msg);

    expect(mockSetNX).toHaveBeenCalledWith('email:dedup:dup-uuid-1', 1, 86400);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(rabbitmq.getChannel().ack).toHaveBeenCalledWith(msg);
    spy.mockRestore();
  });

  it('processes new message (setNX returns true)', async () => {
    mockSetNX.mockResolvedValue(true);
    mockSendEmail.mockResolvedValue({ messageId: 'ses-ok' });

    const msg = buildMsg({ to: 'a@b.com', content: '<p>hi</p>', subject: 'Test' }, 'new-uuid-1');
    await consumeCallback(msg);

    expect(mockSendEmail).toHaveBeenCalledWith('a@b.com', '<p>hi</p>', 'Test');
    expect(rabbitmq.getChannel().ack).toHaveBeenCalledWith(msg);
  });

  it('sends email when Redis is down (dedup skipped, no email loss)', async () => {
    mockRedisReady.mockReturnValue(false);
    mockSendEmail.mockResolvedValue({ messageId: 'ses-ok' });

    const msg = buildMsg(
      { to: 'a@b.com', content: '<p>hi</p>', subject: 'Test' },
      'redis-down-uuid'
    );
    await consumeCallback(msg);

    expect(mockSetNX).not.toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalledWith('a@b.com', '<p>hi</p>', 'Test');
    expect(rabbitmq.getChannel().ack).toHaveBeenCalledWith(msg);
  });

  it('processes message without messageId (no dedup check)', async () => {
    mockSendEmail.mockResolvedValue({ messageId: 'ses-ok' });

    const msg = buildMsg({ to: 'a@b.com', content: '<p>hi</p>' }, undefined);
    await consumeCallback(msg);

    expect(mockSetNX).not.toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalled();
  });
});
