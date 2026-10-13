import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Res,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type Response } from 'express';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JobTrackerService, type Job } from './job-tracker.service.js';
import { RedisService } from '../redis/redis.service.js';

@ApiTags('Jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JobController {
  constructor(
    private readonly jobTracker: JobTrackerService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get current user's active jobs" })
  @ApiResponse({ status: 200, description: 'List of active jobs' })
  async getActiveJobs(@CurrentUser('id') userId: string) {
    const jobs = await this.jobTracker.getActiveByUser(userId);
    return { success: true, jobs };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job status' })
  @ApiResponse({ status: 200, description: 'Job details' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJob(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const job = await this.jobTracker.get(id);
    if (!job) throw new NotFoundException('Job not found');
    if (job.meta?.userId !== userId) throw new ForbiddenException();
    return { success: true, job };
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream job progress via SSE' })
  async streamJob(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const job = await this.jobTracker.get(id);
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }
    if (job.meta?.userId !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send initial state
    res.write(`data: ${JSON.stringify(job)}\n\n`);

    if (job.status === 'completed' || job.status === 'failed') {
      return res.end();
    }

    // Subscribe to Redis Pub/Sub for real-time updates
    const subscriber = await this.redis.createSubscriber();
    if (!subscriber) {
      res.write(
        `data: ${JSON.stringify({ status: 'stream_unavailable', error: 'Real-time streaming unavailable.' })}\n\n`,
      );
      return res.end();
    }

    const channel = this.jobTracker.CHANNEL_PREFIX + id;
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

    // Race condition: check if job finished between initial send and subscribe
    const current = await this.jobTracker.get(id);
    if (current && (current.status === 'completed' || current.status === 'failed')) {
      res.write(`data: ${JSON.stringify(current)}\n\n`);
      await cleanup();
      return res.end();
    }

    res.on('close', cleanup);
  }
}
