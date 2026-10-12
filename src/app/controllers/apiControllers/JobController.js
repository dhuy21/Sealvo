const jobTracker = require('../../core/jobTracker');
const redis = require('../../core/redis');
const { NotFoundError, ForbiddenError } = require('../../errors/AppError');

class JobController {
  async getActiveJobs(req, res) {
    const jobs = await jobTracker.getActiveByUser(req.session.user.id);
    res.json({ success: true, jobs });
  }

  async getJob(req, res) {
    const job = await jobTracker.get(req.params.id);
    if (!job) throw new NotFoundError('Job not found.');
    if (!job.meta?.userId || job.meta.userId !== req.session.user?.id) {
      throw new ForbiddenError('Forbidden.');
    }
    res.json({ success: true, job });
  }

  async streamJob(req, res) {
    const jobId = req.params.id;

    const job = await jobTracker.get(jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    if (!job.meta?.userId || job.meta.userId !== req.session.user?.id) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write(`data: ${JSON.stringify(job)}\n\n`);

    if (job.status === 'completed' || job.status === 'failed') {
      return res.end();
    }

    const subscriber = await redis.createSubscriber();
    if (!subscriber) {
      res.write(
        `data: ${JSON.stringify({ status: 'stream_unavailable', error: 'Le streaming en temps réel est indisponible. Veuillez rafraîchir la page.' })}\n\n`
      );
      return res.end();
    }

    const channel = jobTracker.CHANNEL_PREFIX + jobId;
    let closed = false;

    const cleanup = async () => {
      if (closed) return;
      closed = true;
      try {
        await subscriber.unsubscribe(channel);
        await subscriber.quit();
      } catch {
        /* already closed */
      }
    };

    await subscriber.subscribe(channel, (message) => {
      if (closed) return;
      try {
        res.write(`data: ${message}\n\n`);
      } catch {
        cleanup();
        return;
      }
      try {
        const data = JSON.parse(message);
        if (data.status === 'completed' || data.status === 'failed') {
          cleanup().then(() => res.end());
        }
      } catch {
        /* ignore parse errors */
      }
    });

    const current = await jobTracker.get(jobId);
    if (current && (current.status === 'completed' || current.status === 'failed')) {
      res.write(`data: ${JSON.stringify(current)}\n\n`);
      await cleanup();
      return res.end();
    }

    req.on('close', cleanup);
  }
}

module.exports = new JobController();
