const express = require('express');
const { isReady: redisReady } = require('../core/redis');
const { isReady: rabbitReady } = require('../core/rabbitmq');
const { CircuitBreaker } = require('../core/resilience');

const router = express.Router();

router.get('/deps', (_req, res) => {
  const breakers = {};
  for (const [name, cb] of CircuitBreaker.getAll()) {
    breakers[name] = {
      state: cb.getState(),
      failureCount: cb.failureCount,
    };
  }

  const infra = {
    redis: redisReady() ? 'UP' : 'DOWN',
    rabbitmq: rabbitReady() ? 'UP' : 'DOWN',
  };

  const allHealthy =
    Object.values(breakers).every((b) => b.state === 'CLOSED') &&
    Object.values(infra).every((s) => s === 'UP');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    infra,
    circuitBreakers: breakers,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
