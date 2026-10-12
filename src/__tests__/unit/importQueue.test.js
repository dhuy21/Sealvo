const rabbitmq = require('../../app/core/rabbitmq');
const jobTracker = require('../../app/core/jobTracker');
const wordProcessingService = require('../../app/services/wordProcessingService');

jest.mock('../../app/core/rabbitmq');
jest.mock('../../app/core/jobTracker');
jest.mock('../../app/services/wordProcessingService');
jest.mock('xlsx');

const importQueue = require('../../app/queues/importQueue');

const mockChannel = {
  assertExchange: jest.fn(),
  assertQueue: jest.fn(),
  bindQueue: jest.fn(),
  publish: jest.fn(),
  sendToQueue: jest.fn(),
  consume: jest.fn(),
  ack: jest.fn(),
  nack: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  rabbitmq.getChannel.mockReturnValue(mockChannel);
  rabbitmq.isReady.mockReturnValue(true);
  jobTracker.update.mockResolvedValue(true);
});

describe('importQueue (unit)', () => {
  describe('setupTopology', () => {
    it('declares import exchanges, queues and bindings', async () => {
      await importQueue.setupTopology();

      expect(mockChannel.assertExchange).toHaveBeenCalledWith('import.direct', 'direct', {
        durable: true,
      });
      expect(mockChannel.assertExchange).toHaveBeenCalledWith('import.retry.direct', 'direct', {
        durable: true,
      });

      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        'import.process',
        expect.objectContaining({
          durable: true,
          arguments: { 'x-dead-letter-exchange': 'import.retry.direct' },
        })
      );

      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        'import.retry',
        expect.objectContaining({
          durable: true,
          arguments: expect.objectContaining({
            'x-message-ttl': 30_000,
            'x-dead-letter-exchange': 'import.direct',
          }),
        })
      );

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('import.failed', { durable: true });
      expect(mockChannel.bindQueue).toHaveBeenCalledTimes(2);
    });

    it('throws when channel is not available', async () => {
      rabbitmq.getChannel.mockReturnValue(null);
      await expect(importQueue.setupTopology()).rejects.toThrow('Channel not available');
    });
  });

  describe('publish', () => {
    it('publishes JSON payload to import exchange', () => {
      const payload = { jobId: 'j1', wordsData: [{ word: 'hello' }], packageId: 5, userId: 1 };
      const result = importQueue.publish(payload);

      expect(result).toBe(true);
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'import.direct',
        'import',
        expect.any(Buffer),
        expect.objectContaining({ persistent: true, contentType: 'application/json' })
      );

      const sent = JSON.parse(mockChannel.publish.mock.calls[0][2].toString());
      expect(sent.jobId).toBe('j1');
      expect(sent.wordsData).toHaveLength(1);
    });

    it('returns false when channel is null', () => {
      rabbitmq.getChannel.mockReturnValue(null);
      expect(importQueue.publish({ jobId: 'j1' })).toBe(false);
    });
  });

  describe('parseExcelFile', () => {
    it('parses Excel file and returns word objects', () => {
      const xlsx = require('xlsx');
      xlsx.readFile.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      xlsx.utils.sheet_to_json.mockReturnValue([
        [
          'Word',
          'Lang',
          'Subject',
          'Type',
          'Pron',
          'Meaning',
          'Example',
          'Syn',
          'Ant',
          'Grammar',
          'Level',
        ],
        ['hello', 'en', 'Daily', 'noun', '', 'salut', '', '', '', '', 'A1'],
      ]);

      const words = importQueue.parseExcelFile('/fake/path.xlsx');
      expect(words).toHaveLength(1);
      expect(words[0]).toMatchObject({
        word: 'hello',
        language_code: 'en',
        subject: 'Daily',
        type: 'noun',
        meaning: 'salut',
        level: 'A1',
      });
    });

    it('returns empty array for empty Excel file', () => {
      const xlsx = require('xlsx');
      xlsx.readFile.mockReturnValue({ SheetNames: ['S1'], Sheets: { S1: {} } });
      xlsx.utils.sheet_to_json.mockReturnValue([]);
      expect(importQueue.parseExcelFile('/empty.xlsx')).toEqual([]);
    });

    it('includes rows with missing columns so validateWords can detect them', () => {
      const xlsx = require('xlsx');
      xlsx.readFile.mockReturnValue({ SheetNames: ['S1'], Sheets: { S1: {} } });
      xlsx.utils.sheet_to_json.mockReturnValue([
        ['hello', undefined, 'Daily', 'noun', '', undefined, '', '', '', '', 'A1'],
      ]);
      const words = importQueue.parseExcelFile('/bad.xlsx');
      expect(words).toHaveLength(1);
      expect(words[0].word).toBe('hello');
      expect(words[0].language_code).toBe('');
      expect(words[0].meaning).toBe('');
    });

    it('skips rows where word cell is empty', () => {
      const xlsx = require('xlsx');
      xlsx.readFile.mockReturnValue({ SheetNames: ['S1'], Sheets: { S1: {} } });
      xlsx.utils.sheet_to_json.mockReturnValue([
        [undefined, 'en', 'Daily', 'noun', '', 'salut', '', '', '', '', 'A1'],
        ['', 'en', 'Daily', 'noun', '', 'salut', '', '', '', '', 'A1'],
      ]);
      expect(importQueue.parseExcelFile('/bad.xlsx')).toEqual([]);
    });
  });

  describe('startConsumer', () => {
    it('registers a consumer on import.process queue', async () => {
      await importQueue.startConsumer();
      expect(mockChannel.consume).toHaveBeenCalledWith('import.process', expect.any(Function));
    });

    it('processes wordsData and acks on success', async () => {
      wordProcessingService.processWords.mockResolvedValue({ successCount: 3, errChamps: 0 });

      mockChannel.consume.mockImplementation(async (_queue, handler) => {
        await handler({
          content: Buffer.from(
            JSON.stringify({
              jobId: 'j1',
              wordsData: [{ word: 'a' }, { word: 'b' }, { word: 'c' }],
              packageId: 5,
              userId: 1,
            })
          ),
          properties: { headers: {} },
        });
      });

      await importQueue.startConsumer();

      expect(wordProcessingService.processWords).toHaveBeenCalledWith(
        expect.any(Array),
        5,
        1,
        expect.objectContaining({ onPhase: expect.any(Function), onProgress: expect.any(Function) })
      );
      expect(jobTracker.update).toHaveBeenCalledWith(
        'j1',
        expect.objectContaining({ status: 'completed' })
      );
      expect(mockChannel.ack).toHaveBeenCalled();
    });

    it('nacks on first failure for DLX retry', async () => {
      wordProcessingService.processWords.mockRejectedValue(new Error('DB error'));

      mockChannel.consume.mockImplementation(async (_queue, handler) => {
        await handler({
          content: Buffer.from(
            JSON.stringify({ jobId: 'j1', wordsData: [], packageId: 5, userId: 1 })
          ),
          properties: { headers: {} },
        });
      });

      await importQueue.startConsumer();
      expect(mockChannel.nack).toHaveBeenCalledWith(expect.anything(), false, false);
      expect(jobTracker.update).toHaveBeenCalledWith(
        'j1',
        expect.objectContaining({ status: 'retrying' })
      );
    });

    it('moves to failed queue after MAX_RETRIES', async () => {
      wordProcessingService.processWords.mockRejectedValue(new Error('fatal'));

      mockChannel.consume.mockImplementation(async (_queue, handler) => {
        await handler({
          content: Buffer.from(
            JSON.stringify({ jobId: 'j1', wordsData: [], packageId: 5, userId: 1 })
          ),
          properties: {
            headers: { 'x-death': [{ queue: 'import.process', count: 1, reason: 'rejected' }] },
          },
        });
      });

      await importQueue.startConsumer();
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith('import.failed', expect.any(Buffer), {
        persistent: true,
      });
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(jobTracker.update).toHaveBeenCalledWith(
        'j1',
        expect.objectContaining({ status: 'failed' })
      );
    });

    it('discards message with invalid JSON', async () => {
      mockChannel.consume.mockImplementation(async (_queue, handler) => {
        await handler({ content: Buffer.from('bad json'), properties: { headers: {} } });
      });

      await importQueue.startConsumer();
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(wordProcessingService.processWords).not.toHaveBeenCalled();
    });

    it('ignores null messages', async () => {
      mockChannel.consume.mockImplementation(async (_queue, handler) => {
        await handler(null);
      });

      await importQueue.startConsumer();
      expect(mockChannel.ack).not.toHaveBeenCalled();
    });
  });
});
