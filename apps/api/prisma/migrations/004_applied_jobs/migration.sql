-- CreateTable
CREATE TABLE `applied_jobs` (
    `job_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `applied_jobs_created_at_idx`(`created_at`),
    PRIMARY KEY (`job_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
