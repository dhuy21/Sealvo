-- No longer read or written. Logins are rows in user_activities.
-- AlterTable
ALTER TABLE `users` DROP COLUMN `last_login`;
