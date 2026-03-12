jest.mock('amqplib');

let amqp;
let rabbitmq;

const mockChannel = {
  prefetch: jest.fn(),
  close: jest.fn(),
  on: jest.fn().mockReturnThis(),
};

const mockConnection = {
  createConfirmChannel: jest.fn().mockResolvedValue(mockChannel),
  close: jest.fn(),
  on: jest.fn().mockReturnThis(),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  process.env.RABBITMQ_DEFAULT_HOST = 'localhost';
  process.env.RABBITMQ_DEFAULT_PORT = '5672';
  process.env.RABBITMQ_DEFAULT_USER = 'guest';
  process.env.RABBITMQ_DEFAULT_PASS = 'guest';
  delete process.env.RABBITMQ_URL;
  amqp = require('amqplib');
  amqp.connect.mockResolvedValue(mockConnection);
  rabbitmq = require('../../app/core/rabbitmq');
});

afterEach(() => {
  delete process.env.RABBITMQ_DEFAULT_HOST;
  delete process.env.RABBITMQ_DEFAULT_PORT;
  delete process.env.RABBITMQ_DEFAULT_USER;
  delete process.env.RABBITMQ_DEFAULT_PASS;
});

describe('rabbitmq (unit)', () => {
  describe('connect', () => {
    it('connects using host/port/user/pass from env', async () => {
      await rabbitmq.connect();
      expect(amqp.connect).toHaveBeenCalledWith('amqp://guest:guest@localhost:5672');
      expect(mockConnection.createConfirmChannel).toHaveBeenCalled();
      expect(mockChannel.prefetch).toHaveBeenCalledWith(1);
      expect(rabbitmq.isReady()).toBe(true);
    });

    it('prefers RABBITMQ_URL when set', async () => {
      process.env.RABBITMQ_URL = 'amqp://prod:pass@broker:5672';
      await rabbitmq.connect();
      expect(amqp.connect).toHaveBeenCalledWith('amqp://prod:pass@broker:5672');
    });

    it('skips connection when no host is configured', async () => {
      delete process.env.RABBITMQ_DEFAULT_HOST;
      await rabbitmq.connect();
      expect(amqp.connect).not.toHaveBeenCalled();
      expect(rabbitmq.isReady()).toBe(false);
    });
  });

  describe('getChannel', () => {
    it('returns null before connect', () => {
      expect(rabbitmq.getChannel()).toBeNull();
    });

    it('returns the channel after connect', async () => {
      await rabbitmq.connect();
      expect(rabbitmq.getChannel()).toBe(mockChannel);
    });
  });

  describe('disconnect', () => {
    it('closes channel and connection', async () => {
      await rabbitmq.connect();
      await rabbitmq.disconnect();
      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
      expect(rabbitmq.isReady()).toBe(false);
    });

    it('handles disconnect when not connected', async () => {
      await rabbitmq.disconnect();
      expect(mockChannel.close).not.toHaveBeenCalled();
    });
  });
});
