-- Structure de la table pour les scores des jeux
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
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
