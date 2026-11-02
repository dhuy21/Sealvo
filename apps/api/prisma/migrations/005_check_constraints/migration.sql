-- CHECK constraints from the old app's schema (src/migrations/001_initial.sql), which Prisma
-- cannot express. Databases created by the old schema already have them under generated names
-- (users_chk_1, ...): each one is added only when no CHECK on that table mentions the column.
-- Fails if existing rows violate a rule; find them first with the SELECTs in docs/railway-setup.md.

SET @has_check = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS tc
  JOIN information_schema.CHECK_CONSTRAINTS cc
    ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
  WHERE tc.TABLE_SCHEMA = DATABASE() AND tc.TABLE_NAME = 'users'
    AND tc.CONSTRAINT_TYPE = 'CHECK' AND cc.CHECK_CLAUSE LIKE '%`ava`%'
);
SET @sql = IF(@has_check = 0,
  'ALTER TABLE `users` ADD CONSTRAINT `users_ava_range` CHECK (`ava` BETWEEN 1 AND 11)',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_check = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS tc
  JOIN information_schema.CHECK_CONSTRAINTS cc
    ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
  WHERE tc.TABLE_SCHEMA = DATABASE() AND tc.TABLE_NAME = 'users'
    AND tc.CONSTRAINT_TYPE = 'CHECK' AND cc.CHECK_CLAUSE LIKE '%`email`%'
);
SET @sql = IF(@has_check = 0,
  'ALTER TABLE `users` ADD CONSTRAINT `users_email_format` CHECK (`email` REGEXP ''^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$'')',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_check = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS tc
  JOIN information_schema.CHECK_CONSTRAINTS cc
    ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
  WHERE tc.TABLE_SCHEMA = DATABASE() AND tc.TABLE_NAME = 'words'
    AND tc.CONSTRAINT_TYPE = 'CHECK' AND cc.CHECK_CLAUSE LIKE '%`language_code`%'
);
SET @sql = IF(@has_check = 0,
  'ALTER TABLE `words` ADD CONSTRAINT `words_language_code` CHECK (`language_code` IN (''en-US'', ''en-GB'', ''fr-FR'', ''es-ES'', ''de-DE'', ''it-IT'', ''ja-JP'', ''zh-CN'', ''zh-HK'', ''zh-TW'', ''pt-PT'', ''ru-RU'', ''vi-VN'', ''ko-KR'', ''id-ID'', ''hi-IN'', ''pl-PL'', ''nl-NL''))',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
