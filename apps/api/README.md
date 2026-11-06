# API

NestJS service for Sealvo. How to run the stack, and how it is deployed, is in the
[repository README](../../README.md).

The image starts one of three processes:

- `node dist/main.js`, the HTTP API
- `node dist/worker.js`, the RabbitMQ consumer (import and email)
- `node dist/scheduler.js`, the reminder cron

`node scripts/backup-db.mjs` is the nightly MySQL backup to S3.
