SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS web_db;
USE web_db



CREATE TABLE IF NOT EXISTS users (
  id CHAR(7) NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role ENUM('Admin', 'User') NOT NULL DEFAULT 'User',
  password VARCHAR(255) NOT NULL,
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

CREATE TABLE IF NOT EXISTS learning (
    user_id CHAR(7) NOT NULL,
    word_id INT NOT NULL,
    level ENUM('0', '1', '2','x') NOT NULL DEFAULT '0',
    date_memorized TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, word_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (word_id) REFERENCES words(word_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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

CREATE TABLE IF NOT EXISTS word_pronunciations (
    pronun_id INT NOT NULL AUTO_INCREMENT,
    detail_id INT NOT NULL,
    pronunciation VARCHAR(255) NOT NULL,
    PRIMARY KEY (pronun_id),
    FOREIGN KEY (detail_id) REFERENCES word_details(detail_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
