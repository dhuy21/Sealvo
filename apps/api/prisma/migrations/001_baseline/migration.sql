-- CreateTable
CREATE TABLE `email_verification` (
    `id` CHAR(64) NOT NULL,
    `user_id` CHAR(7) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `status` ENUM('pending', 'used', 'revoked') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `used_at` DATETIME(0) NULL,

    INDEX `idx_user_id`(`user_id`),
    INDEX `ux_token_hash`(`token_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- CreateTable
CREATE TABLE `learning` (
    `detail_id` INTEGER NOT NULL,
    `package_id` INTEGER NOT NULL,
    `level` ENUM('x', '0', '1', '2', 'v') NOT NULL,
    `date_memorized` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `date_stocked` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_learning_pkg_lvl_date`(`package_id`, `level`, `date_memorized`),
    PRIMARY KEY (`detail_id`, `package_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- CreateTable
CREATE TABLE `packages` (
    `package_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` CHAR(7) NOT NULL,
    `package_name` VARCHAR(255) NOT NULL,
    `package_description` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `mode` ENUM('protected', 'private', 'public') NOT NULL DEFAULT 'private',
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `idx_packages_mode_created`(`mode`, `created_at`),
    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`package_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- CreateTable
CREATE TABLE `schema_migrations` (
    `name` VARCHAR(255) NOT NULL,
    `applied_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- CreateTable
CREATE TABLE `user_best_scores` (
    `user_id` CHAR(7) NOT NULL,
    `game_type` ENUM('word_scramble', 'flash_match', 'speed_vocab', 'vocab_quiz', 'phrase_completion', 'word_search', 'test_pronun') NOT NULL,
    `best_score` INTEGER NOT NULL DEFAULT 0,
    `play_count` INTEGER NOT NULL DEFAULT 0,
    `last_played_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`user_id`, `game_type`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(7) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `role` ENUM('Admin', 'User') NOT NULL DEFAULT 'User',
    `password` VARCHAR(255) NOT NULL,
    `streak` INTEGER NOT NULL DEFAULT 0,
    `streak_updated_at` TIMESTAMP(0) NULL,
    `last_login` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `ava` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `username`(`username`),
    UNIQUE INDEX `email`(`email`),
    INDEX `idx_users_verified_created`(`is_verified`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- CreateTable
CREATE TABLE `word_details` (
    `detail_id` INTEGER NOT NULL AUTO_INCREMENT,
    `word_id` INTEGER NOT NULL,
    `type` ENUM('noun', 'verb', 'adjective', 'adverb', 'ph.v', 'idiom', 'collocation') NOT NULL,
    `meaning` TEXT NOT NULL,
    `pronunciation` VARCHAR(255) NULL,
    `synonyms` TEXT NULL,
    `antonyms` TEXT NULL,
    `example` TEXT NULL,
    `grammar` TEXT NULL,

    INDEX `word_id`(`word_id`),
    PRIMARY KEY (`detail_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- CreateTable
CREATE TABLE `words` (
    `word_id` INTEGER NOT NULL AUTO_INCREMENT,
    `word` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `language_code` VARCHAR(10) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_words_word_subject_lang`(`word`, `subject`, `language_code`),
    PRIMARY KEY (`word_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- AddForeignKey
ALTER TABLE `email_verification` ADD CONSTRAINT `email_verification_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learning` ADD CONSTRAINT `learning_ibfk_1` FOREIGN KEY (`detail_id`) REFERENCES `word_details`(`detail_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `learning` ADD CONSTRAINT `learning_ibfk_2` FOREIGN KEY (`package_id`) REFERENCES `packages`(`package_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packages` ADD CONSTRAINT `packages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_best_scores` ADD CONSTRAINT `user_best_scores_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `word_details` ADD CONSTRAINT `word_details_ibfk_1` FOREIGN KEY (`word_id`) REFERENCES `words`(`word_id`) ON DELETE CASCADE ON UPDATE CASCADE;

