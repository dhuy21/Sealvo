import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { type Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JOB_TTL_SECONDS } from '@sealvo/shared';
import { JobTrackerService, isFinished, type Job } from './job-tracker.service.js';
import { ImportOutboxService } from './import-outbox.service.js';

/** A user follows one stream per active job: more means a leak or abuse */
const MAX_STREAMS_PER_USER = 10;

@ApiTags('Jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JobController {
  /** Open streams per user (single API instance): each one holds an HTTP connection for up to the job TTL */
  private readonly openStreams = new Map<string, number>();

  constructor(
    private readonly jobTracker: JobTrackerService,
    private readonly outbox: ImportOutboxService,
  ) {}

  /** Redis while the job is live. The outbox row covers the wait before RabbitMQ accepts it. */
  private async visibleJob(id: string, userId: string): Promise<Job> {
    try {
      return await this.jobTracker.getOwned(id, userId);
    } catch (err) {
      if (!(err instanceof NotFoundException)) throw err;
      const pending = await this.outbox.findOwned(id, userId);
      if (!pending) throw err;
      return {
        id: pending.job_id,
        type: pending.type,
        status: 'pending',
        progress: { current: 0, total: pending.word_count, phase: 'parsing' },
        result: null,
        error: null,
        meta: { userId: pending.user_id, packageId: String(pending.package_id) },
        createdAt: pending.created_at.getTime(),
        updatedAt: pending.created_at.getTime(),
      };
    }
  }

  @Get()
  @ApiOperation({ summary: "Get current user's active jobs" })
  @ApiResponse({ status: 200, description: 'List of active jobs' })
  async getActiveJobs(@CurrentUser('id') userId: string) {
    const jobs = await this.jobTracker.getActiveByUser(userId);
    return { success: true, jobs };
  }

  @Get(':id')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get job status' })
  @ApiResponse({ status: 200, description: 'Job details' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJob(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const job = await this.visibleJob(id, userId);
    return { success: true, job };
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream job progress via SSE' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async streamJob(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const job = await this.visibleJob(id, userId);
    const open = this.openStreams.get(userId) ?? 0;
    if (open >= MAX_STREAMS_PER_USER) {
      throw new HttpException('Trop de suivis de tâches ouverts.', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.openStreams.set(userId, open + 1);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let ended = false;
    let unsubscribe: (() => Promise<void>) | null = null;
    const end = () => {
      if (ended) return;
      ended = true;
      clearTimeout(maxDuration);
      const left = (this.openStreams.get(userId) ?? 1) - 1;
      if (left > 0) this.openStreams.set(userId, left);
      else this.openStreams.delete(userId);
      void unsubscribe?.();
      res.end();
    };
    // The job expires after its TTL: nothing left to stream past that
    const maxDuration = setTimeout(end, JOB_TTL_SECONDS * 1000);
    res.on('close', end);
    // The client may have left while the job was read: 'close' was emitted before the listener
    if (res.destroyed) return end();

    const send = (data: unknown) => {
      if (!ended) res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send(job);
    if (isFinished(job.status)) return end();

    const subscription = await this.jobTracker.subscribe(id, (update) => {
      send(update);
      if (isFinished(update.status)) end();
    });
    if (ended) {
      await subscription?.();
      return;
    }
    if (!subscription) {
      send({
        status: 'stream_unavailable',
        error: 'Le streaming en temps réel est indisponible. Veuillez rafraîchir la page.',
      });
      return end();
    }
    unsubscribe = subscription;

    // The job may have finished between the initial read and the subscription
    const current = await this.jobTracker.get(id);
    if (current && isFinished(current.status)) {
      send(current);
      end();
    }
  }
}
