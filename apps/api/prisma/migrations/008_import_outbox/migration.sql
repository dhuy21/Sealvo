-- Words for a job the broker has not confirmed yet. Removed after a confirmed publish.
-- CreateTable
CREATE TABLE `import_outbox` (
    `job_id` CHAR(36) NOT NULL,
    `user_id` CHAR(7) NOT NULL,
    `package_id` INTEGER NOT NULL,
    `type` ENUM('import', 'addWords') NOT NULL,
    `file_name` VARCHAR(255) NULL,
    `word_count` INTEGER NOT NULL,
    `payload` JSON NOT NULL,
    `created_at` DATETIME(0) NOT NULL,

    INDEX `import_outbox_created_at_idx`(`created_at`),
    PRIMARY KEY (`job_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- AddForeignKey
ALTER TABLE `import_outbox` ADD CONSTRAINT `import_outbox_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
