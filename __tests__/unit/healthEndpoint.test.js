const express = require('express');
const request = require('supertest');
const { CircuitBreaker } = require('../../app/core/resilience');

jest.mock('../../app/core/redis', () => ({
  isReady: jest.fn().mockReturnValue(true),
}));
jest.mock('../../app/core/rabbitmq', () => ({
  isReady: jest.fn().mockReturnValue(true),
}));

const redisModule = require('../../app/core/redis');
const rabbitModule = require('../../app/core/rabbitmq');

const TEST_CRON_SECRET = 'test-health-secret';

function createApp() {
  const app = express();
  app.use('/health', require('../../app/routes/health'));
  return app;
}

function depsRequest(app) {
  return request(app).get('/health/deps').set('X-Cron-Secret', TEST_CRON_SECRET);
}

describe('GET /health/deps', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = TEST_CRON_SECRET;
    CircuitBreaker._registry.clear();
    redisModule.isReady.mockReturnValue(true);
    rabbitModule.isReady.mockReturnValue(true);
  });

  it('returns 403 without valid secret', async () => {
    const res = await request(createApp()).get('/health/deps').set('X-Cron-Secret', 'wrong-secret');

    expect(res.status).toBe(403);
  });

  it('returns 200 + healthy when all deps are UP and breakers CLOSED', async () => {
    new CircuitBreaker({ name: 'svc-a', threshold: 5, resetTimeout: 1000 });

    const res = await depsRequest(createApp());

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.infra.redis).toBe('UP');
    expect(res.body.infra.rabbitmq).toBe('UP');
    expect(res.body.circuitBreakers['svc-a'].state).toBe('CLOSED');
    expect(res.body.timestamp).toBeDefined();
  });

  it('returns 503 + degraded when a circuit breaker is OPEN', async () => {
    const b = new CircuitBreaker({ name: 'svc-broken', threshold: 1, resetTimeout: 60000 });
    await b.execute(() => Promise.reject(new Error('fail'))).catch(() => {});

    const res = await depsRequest(createApp());

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.circuitBreakers['svc-broken'].state).toBe('OPEN');
  });

  it('returns 503 + degraded when Redis is DOWN', async () => {
    redisModule.isReady.mockReturnValue(false);

    const res = await depsRequest(createApp());

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.infra.redis).toBe('DOWN');
  });

  it('returns 503 + degraded when RabbitMQ is DOWN', async () => {
    rabbitModule.isReady.mockReturnValue(false);

    const res = await depsRequest(createApp());

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.infra.rabbitmq).toBe('DOWN');
  });

  it('returns 200 when no circuit breakers exist and infra is UP', async () => {
    const res = await depsRequest(createApp());

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.circuitBreakers).toEqual({});
  });
});
