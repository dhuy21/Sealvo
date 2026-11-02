-- Same collation as the tables created by the old app (src/migrations/001_initial.sql):
-- MySQL rejects foreign keys between columns of different collations.
-- CreateTable
CREATE TABLE `refresh_sessions` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(7) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `previous_hash` CHAR(64) NULL,
    `rotated_at` DATETIME(0) NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `refresh_sessions_user_id_idx`(`user_id`),
    INDEX `refresh_sessions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `token_hash` CHAR(64) NOT NULL,
    `user_id` CHAR(7) NOT NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `password_reset_tokens_user_id_idx`(`user_id`),
    PRIMARY KEY (`token_hash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- AddForeignKey
ALTER TABLE `refresh_sessions` ADD CONSTRAINT `refresh_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

