const jobTracker = require('../../app/core/jobTracker');
const redis = require('../../app/core/redis');

jest.mock('../../app/core/jobTracker');
jest.mock('../../app/core/redis');

const jobController = require('../../app/controllers/apiControllers/JobController');

function mockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    flushHeaders: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  };
  return res;
}

function mockReq(id, userId) {
  return {
    params: { id },
    session: { user: { id: userId } },
    on: jest.fn(),
  };
}

beforeEach(() => jest.clearAllMocks());

describe('JobController (unit)', () => {
  describe('getActiveJobs', () => {
    it('returns active jobs for the authenticated user', async () => {
      const jobs = [
        { id: 'j1', status: 'processing' },
        { id: 'j2', status: 'pending' },
      ];
      jobTracker.getActiveByUser.mockResolvedValue(jobs);
      const req = { session: { user: { id: 42 } } };
      const res = mockRes();
      await jobController.getActiveJobs(req, res);
      expect(jobTracker.getActiveByUser).toHaveBeenCalledWith(42);
      expect(res.json).toHaveBeenCalledWith({ success: true, jobs });
    });

    it('returns empty array when no active jobs', async () => {
      jobTracker.getActiveByUser.mockResolvedValue([]);
      const req = { session: { user: { id: 1 } } };
      const res = mockRes();
      await jobController.getActiveJobs(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, jobs: [] });
    });
  });

  describe('getJob', () => {
    it('returns 404 when job does not exist', async () => {
      jobTracker.get.mockResolvedValue(null);
      const res = mockRes();
      await jobController.getJob(mockReq('j1', 1), res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('returns 403 when userId does not match (ownership check)', async () => {
      jobTracker.get.mockResolvedValue({ id: 'j1', meta: { userId: 99 } });
      const res = mockRes();
      await jobController.getJob(mockReq('j1', 1), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 403 when job has no meta.userId (deny-by-default)', async () => {
      jobTracker.get.mockResolvedValue({ id: 'j1', meta: {} });
      const res = mockRes();
      await jobController.getJob(mockReq('j1', 1), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns job data when ownership matches', async () => {
      const job = { id: 'j1', status: 'processing', meta: { userId: 42 } };
      jobTracker.get.mockResolvedValue(job);
      const res = mockRes();
      await jobController.getJob(mockReq('j1', 42), res);
      expect(res.json).toHaveBeenCalledWith({ success: true, job });
    });
  });

  describe('streamJob', () => {
    it('returns 404 when job does not exist', async () => {
      jobTracker.get.mockResolvedValue(null);
      const res = mockRes();
      await jobController.streamJob(mockReq('j1', 1), res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when ownership fails', async () => {
      jobTracker.get.mockResolvedValue({ id: 'j1', meta: { userId: 99 } });
      const res = mockRes();
      await jobController.streamJob(mockReq('j1', 1), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('sets SSE headers correctly', async () => {
      jobTracker.get.mockResolvedValue({ id: 'j1', status: 'completed', meta: { userId: 1 } });
      const res = mockRes();
      await jobController.streamJob(mockReq('j1', 1), res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(res.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
      expect(res.flushHeaders).toHaveBeenCalled();
    });

    it('sends initial job state and closes if already completed', async () => {
      const job = { id: 'j1', status: 'completed', meta: { userId: 1 } };
      jobTracker.get.mockResolvedValue(job);
      const res = mockRes();
      await jobController.streamJob(mockReq('j1', 1), res);

      expect(res.write).toHaveBeenCalledWith(`data: ${JSON.stringify(job)}\n\n`);
      expect(res.end).toHaveBeenCalled();
    });

    it('sends initial job state and closes if already failed', async () => {
      const job = { id: 'j1', status: 'failed', meta: { userId: 1 } };
      jobTracker.get.mockResolvedValue(job);
      const res = mockRes();
      await jobController.streamJob(mockReq('j1', 1), res);

      expect(res.write).toHaveBeenCalledWith(`data: ${JSON.stringify(job)}\n\n`);
      expect(res.end).toHaveBeenCalled();
    });

    it('sends stream_unavailable when Redis subscriber fails', async () => {
      jobTracker.get.mockResolvedValue({ id: 'j1', status: 'processing', meta: { userId: 1 } });
      redis.createSubscriber.mockResolvedValue(null);
      const res = mockRes();
      await jobController.streamJob(mockReq('j1', 1), res);

      const writeCall = res.write.mock.calls.find((c) => c[0].includes('stream_unavailable'));
      expect(writeCall).toBeDefined();
      expect(res.end).toHaveBeenCalled();
    });

    it('subscribes to Redis channel and registers cleanup on close', async () => {
      jobTracker.get
        .mockResolvedValueOnce({ id: 'j1', status: 'processing', meta: { userId: 1 } })
        .mockResolvedValueOnce({ id: 'j1', status: 'processing', meta: { userId: 1 } });

      const mockSubscriber = {
        subscribe: jest.fn().mockResolvedValue(undefined),
        unsubscribe: jest.fn().mockResolvedValue(undefined),
        quit: jest.fn().mockResolvedValue(undefined),
      };
      redis.createSubscriber.mockResolvedValue(mockSubscriber);

      const req = mockReq('j1', 1);
      const res = mockRes();
      await jobController.streamJob(req, res);

      expect(mockSubscriber.subscribe).toHaveBeenCalledWith('job-events:j1', expect.any(Function));
      expect(req.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('re-checks job after subscribe and closes if completed (race condition fix)', async () => {
      jobTracker.get
        .mockResolvedValueOnce({ id: 'j1', status: 'processing', meta: { userId: 1 } })
        .mockResolvedValueOnce({
          id: 'j1',
          status: 'completed',
          result: { successCount: 5 },
          meta: { userId: 1 },
        });

      const mockSubscriber = {
        subscribe: jest.fn().mockResolvedValue(undefined),
        unsubscribe: jest.fn().mockResolvedValue(undefined),
        quit: jest.fn().mockResolvedValue(undefined),
      };
      redis.createSubscriber.mockResolvedValue(mockSubscriber);

      const res = mockRes();
      await jobController.streamJob(mockReq('j1', 1), res);

      const completedWrite = res.write.mock.calls.find((c) => c[0].includes('completed'));
      expect(completedWrite).toBeDefined();
      expect(res.end).toHaveBeenCalled();
      expect(mockSubscriber.unsubscribe).toHaveBeenCalled();
    });
  });
});
