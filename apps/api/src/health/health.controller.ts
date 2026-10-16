import { Controller, Get, HttpStatus, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CircuitBreaker } from '@sealvo/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service.js';
import { CronSecretGuard } from '../auth/guards/cron-secret.guard.js';

@SkipThrottle()
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly rabbitmq: RabbitmqService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check — DB connectivity + uptime' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(@Res() res: Response) {
    const start = Date.now();

    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }

    const isHealthy = dbStatus === 'ok';
    const body = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      // Build commit (GIT_SHA build arg): CI waits for it to know the new deployment is live
      version: process.env.GIT_SHA || 'unknown',
      uptime: process.uptime(),
      db: dbStatus,
      latency: Date.now() - start,
      timestamp: new Date().toISOString(),
    };

    res.status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(body);
  }

  @Get('deps')
  @UseGuards(CronSecretGuard)
  @ApiOperation({
    summary: 'Dependencies check — circuit breakers + Redis/RabbitMQ (X-Cron-Secret)',
  })
  @ApiResponse({ status: 200, description: 'All dependencies healthy' })
  @ApiResponse({ status: 503, description: 'At least one dependency degraded' })
  deps(@Res() res: Response) {
    const circuitBreakers: Record<string, { state: string; failureCount: number }> = {};
    for (const [name, cb] of CircuitBreaker.getAll()) {
      circuitBreakers[name] = {
        state: cb.getState(),
        failureCount: cb.failureCount,
      };
    }

    const infra = {
      redis: this.redis.isReady() ? 'UP' : 'DOWN',
      rabbitmq: this.rabbitmq.isReady() ? 'UP' : 'DOWN',
    };

    const allHealthy =
      Object.values(circuitBreakers).every((b) => b.state === 'CLOSED') &&
      Object.values(infra).every((s) => s === 'UP');

    res.status(allHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: allHealthy ? 'healthy' : 'degraded',
      infra,
      circuitBreakers,
      timestamp: new Date().toISOString(),
    });
  }
}
