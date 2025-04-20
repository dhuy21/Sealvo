SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

DROP DATABASE IF EXISTS web_db;
CREATE DATABASE IF NOT EXISTS web_db;
USE web_db



CREATE TABLE IF NOT EXISTS users (
  id CHAR(7) NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role ENUM('Admin', 'User') NOT NULL DEFAULT 'User',
  password VARCHAR(255) NOT NULL,
  streak INT NOT NULL DEFAULT 0,
  last_login TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CHECK (email REGEXP '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS words (
    word_id INT NOT NULL AUTO_INCREMENT,
    word VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (word_id)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*INSERT INTO words (word, subject) VALUES ('Present', 'Daily words');*/

CREATE TABLE IF NOT EXISTS learning (
    user_id CHAR(7) NOT NULL,
    word_id INT NOT NULL,
    level ENUM('x', '0', '1', '2', 'v') NOT NULL,
    date_memorized TIMESTAMP DEFAULT CURRENT_TIMESTAMP ,  -- Sửa từ TIMESTAMP sang DATE
    PRIMARY KEY (user_id, word_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (word_id) REFERENCES words(word_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*INSERT INTO learning (user_id, word_id, level) VALUES ('95a916c', '1', '0');*/

CREATE TABLE IF NOT EXISTS word_details (
    detail_id INT NOT NULL AUTO_INCREMENT,
    word_id INT NOT NULL,
    type ENUM('noun', 'verb', 'adjective', 'adverb', 'ph.v','idiom', 'collocation') NOT NULL,
    meaning TEXT NOT NULL,
    synonyms TEXT,
    antonyms TEXT,
    example TEXT NOT NULL,
    grammar TEXT,
    PRIMARY KEY (detail_id),
    
    FOREIGN KEY (word_id) REFERENCES words(word_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*INSERT INTO word_details (word_id, type, meaning, synonyms, antonyms, example, grammar) VALUES ('1', 'noun', 'Present', 'Present', 'Present', 'Present', 'Present');*/
CREATE TABLE IF NOT EXISTS word_pronunciations (
    pronun_id INT NOT NULL AUTO_INCREMENT,
    detail_id INT NOT NULL,
    pronunciation VARCHAR(255) NOT NULL,
    PRIMARY KEY (pronun_id),
    FOREIGN KEY (detail_id) REFERENCES word_details(detail_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*INSERT INTO word_pronunciations (detail_id, pronunciation) VALUES ('1', 'Present');*/

CREATE TABLE IF NOT EXISTS game_scores (
  id int(11) NOT NULL AUTO_INCREMENT,
  user_id char(7) NOT NULL,
  game_type enum('word_scramble', 'flash_match', 'speed_vocab', 'vocab_quiz') NOT NULL,
  score int(11) NOT NULL DEFAULT 0,
  details text DEFAULT NULL COMMENT 'Détails JSON de la partie',
  is_high_score tinyint(1) NOT NULL DEFAULT 0,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;