-- Migration: 001_initial
-- Description: Complete schema — users, packages, words, word_details, learning, user_best_scores, email_verification.
-- Note: reset_password tokens are managed via Redis (TTL + hashing), no SQL table needed.
-- Applied by: runner inserts into schema_migrations after successful run. Do not add INSERT here.

SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET time_zone = '+00:00';

-- ============================================================
-- Migration tracker
-- ============================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  name VARCHAR(255) NOT NULL PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- Users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id CHAR(7) NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role ENUM('Admin', 'User') NOT NULL DEFAULT 'User',
  password VARCHAR(255) NOT NULL,
  streak INT NOT NULL DEFAULT 0,
  streak_updated_at TIMESTAMP NULL DEFAULT NULL,
  last_login TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ava INT CHECK (ava BETWEEN 1 AND 11) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  INDEX idx_users_verified_created (is_verified, created_at),
  CHECK (email REGEXP '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- Email verification (token hashing, expiry, status tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_verification (
  id CHAR(64) NOT NULL PRIMARY KEY,
  user_id CHAR(7) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  status ENUM('pending','used','revoked') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at DATETIME NULL,
  INDEX ux_token_hash (token_hash),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- Vocabulary packages
-- ============================================================
CREATE TABLE IF NOT EXISTS packages (
  package_id INT NOT NULL AUTO_INCREMENT,
  user_id CHAR(7) NOT NULL,
  package_name VARCHAR(255) NOT NULL,
  package_description TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  mode ENUM('protected', 'private', 'public') NOT NULL DEFAULT 'private',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (package_id),
  INDEX idx_packages_mode_created (mode, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- Words (unique per word + subject + language)
-- ============================================================
CREATE TABLE IF NOT EXISTS words (
  word_id INT NOT NULL AUTO_INCREMENT,
  word VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  language_code VARCHAR(10) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (word_id),
  UNIQUE KEY uq_words_word_subject_lang (word, subject, language_code),
  CHECK (language_code IN ('en-US', 'en-GB', 'fr-FR', 'es-ES', 'de-DE', 'it-IT',
    'ja-JP', 'zh-CN', 'zh-HK', 'zh-TW', 'pt-PT', 'ru-RU', 'vi-VN', 'ko-KR', 'id-ID', 'hi-IN', 'pl-PL', 'nl-NL'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- Word details (pronunciation & example are optional)
-- ============================================================
CREATE TABLE IF NOT EXISTS word_details (
  detail_id INT NOT NULL AUTO_INCREMENT,
  word_id INT NOT NULL,
  type ENUM('noun', 'verb', 'adjective', 'adverb', 'ph.v','idiom', 'collocation') NOT NULL,
  meaning TEXT NOT NULL,
  pronunciation VARCHAR(255) NULL,
  synonyms TEXT,
  antonyms TEXT,
  example TEXT NULL,
  grammar TEXT,
  PRIMARY KEY (detail_id),
  FOREIGN KEY (word_id) REFERENCES words(word_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- Spaced-repetition learning tracker
-- ============================================================
CREATE TABLE IF NOT EXISTS learning (
  detail_id INT NOT NULL,
  package_id INT NOT NULL,
  level ENUM('x', '0', '1', '2', 'v') NOT NULL,
  date_memorized TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_stocked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (detail_id, package_id),
  INDEX idx_learning_pkg_lvl_date (package_id, level, date_memorized),
  FOREIGN KEY (detail_id) REFERENCES word_details(detail_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(package_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- User best scores (1 row per user per game — atomic upsert via ON DUPLICATE KEY UPDATE)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_best_scores (
  user_id CHAR(7) NOT NULL,
  game_type ENUM(
    'word_scramble', 'flash_match', 'speed_vocab', 'vocab_quiz',
    'phrase_completion', 'word_search', 'test_pronun'
  ) NOT NULL,
  best_score INT NOT NULL DEFAULT 0,
  play_count INT NOT NULL DEFAULT 0,
  last_played_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, game_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
