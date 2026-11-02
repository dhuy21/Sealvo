-- Same collation as users.id: MySQL rejects a foreign key across collations.
-- CreateTable
CREATE TABLE `user_activities` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(7) NOT NULL,
    `type` ENUM('login', 'password_change', 'email_change', 'package_create', 'package_delete', 'import', 'add_words') NOT NULL,
    `status` ENUM('running', 'succeeded', 'failed') NOT NULL,
    `occurred_at` DATETIME(0) NOT NULL,
    `updated_at` DATETIME(0) NOT NULL,
    `package_id` INTEGER NULL,
    `package_name` VARCHAR(255) NULL,
    `file_name` VARCHAR(255) NULL,
    `word_count` INTEGER NULL,
    `error_count` INTEGER NULL,
    `phase` ENUM('parsing', 'gemini', 'saving', 'done') NULL,
    `progress_current` INTEGER NULL,
    `job_id` CHAR(36) NULL,
    `error_message` VARCHAR(255) NULL,

    UNIQUE INDEX `user_activities_job_id_key`(`job_id`),
    INDEX `idx_user_activities_user_time`(`user_id`, `occurred_at`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- AddForeignKey
ALTER TABLE `user_activities` ADD CONSTRAINT `user_activities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
