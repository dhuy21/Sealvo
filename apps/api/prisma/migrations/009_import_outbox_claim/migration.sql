-- One worker claims a row before publishing it. The others skip that row until the claim expires.
-- AlterTable
ALTER TABLE `import_outbox` ADD COLUMN `claimed_at` DATETIME(0) NULL;
