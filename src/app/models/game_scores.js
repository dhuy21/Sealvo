class GameScores {
  /**
   * Atomic upsert: inserts first play or updates best score via GREATEST.
   * @returns {Promise<boolean>} true if this score is a new personal best
   */
  async saveScore(user_id, game_type, score) {
    const current = await this.getBestScore(user_id, game_type);
    const isHighScore = !current || score > current.score;

    await global.dbConnection.execute(
      `INSERT INTO user_best_scores (user_id, game_type, best_score, play_count, last_played_at)
       VALUES (?, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE
         best_score = GREATEST(best_score, ?),
         play_count = play_count + 1,
         last_played_at = NOW()`,
      [user_id, game_type, score, score]
    );

    return isHighScore;
  }

  /**
   * @returns {Promise<{score: number, play_count: number, last_played: Date}|null>}
   */
  async getBestScore(user_id, game_type) {
    const [rows] = await global.dbConnection.execute(
      `SELECT best_score AS score, play_count, last_played_at AS last_played
       FROM user_best_scores
       WHERE user_id = ? AND game_type = ?`,
      [user_id, game_type]
    );
    return rows[0] || null;
  }
}

module.exports = new GameScores();
