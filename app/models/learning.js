class Learning {
  getInterval(levelGame) {
    let intervalDate = 0;
    switch (levelGame) {
      case 'x':
        intervalDate = 0;
        break;
      case '0':
        intervalDate = 2;
        break;
      case '1':
        intervalDate = 4;
        break;
      case '2':
        intervalDate = 10;
        break;
      case 'v':
        intervalDate = 20;
        break;
    }
    return parseInt(intervalDate, 10);
  }

  async levelWord(package_id, detail_id) {
    const [rows] = await global.dbConnection.execute(
      'SELECT level FROM learning WHERE package_id = ? AND detail_id = ?',
      [package_id, detail_id]
    );
    return rows[0] || null;
  }

  async updateLevelWord(package_id, detail_id, levelCurrent) {
    const dateMemorized = new Date();

    let newLevel;
    switch (levelCurrent) {
      case 'x':
        newLevel = '0';
        break;
      case '0':
        newLevel = '1';
        break;
      case '1':
        newLevel = '2';
        break;
      case '2':
        newLevel = 'v';
        break;
    }

    const [rows] = await global.dbConnection.execute(
      'UPDATE learning SET level = ?, date_memorized = ? WHERE package_id = ? AND detail_id = ?',
      [newLevel, dateMemorized, package_id, detail_id]
    );

    return rows[0] || null;
  }

  async batchUpdateLevel(package_id, detailIds, currentLevel) {
    const levelMap = { x: '0', 0: '1', 1: '2', 2: 'v' };
    const newLevel = levelMap[currentLevel];
    if (!newLevel || detailIds.length === 0) return 0;

    const placeholders = detailIds.map(() => '?').join(',');
    const [result] = await global.dbConnection.execute(
      `UPDATE learning SET level = ?, date_memorized = NOW() WHERE package_id = ? AND detail_id IN (${placeholders})`,
      [newLevel, package_id, ...detailIds]
    );
    return result.affectedRows;
  }

  async dateMemoryWord(package_id, detail_id) {
    const [rows] = await global.dbConnection.execute(
      'SELECT date_memorized FROM learning WHERE package_id = ? AND detail_id = ?',
      [package_id, detail_id]
    );
    return rows[0] || null;
  }

  async stockWord(package_id, detail_id, level) {
    const [rows] = await global.dbConnection.execute(
      'INSERT INTO learning (package_id, detail_id, level) VALUES (?, ?, ?)',
      [package_id, detail_id, level]
    );
    return rows[0] || null;
  }

  async batchStockWords(package_id, detailIds, level) {
    if (detailIds.length === 0) return;
    const placeholders = detailIds.map(() => '(?, ?, ?)').join(', ');
    const params = detailIds.flatMap((id) => [package_id, id, level]);
    await global.dbConnection.execute(
      `INSERT INTO learning (package_id, detail_id, level) VALUES ${placeholders}`,
      params
    );
  }

  async getNumWordsByLevelAllPackages(user_id, level) {
    const [rows] = await global.dbConnection.execute(
      `SELECT COUNT(*) AS num_words 
                 FROM learning l
                 JOIN word_details wd ON l.detail_id = wd.detail_id
                 JOIN words w ON wd.word_id = w.word_id
                 JOIN packages p ON l.package_id = p.package_id
                 WHERE p.user_id = ? AND l.level = ?`,
      [user_id, level]
    );
    return rows[0].num_words;
  }

  async getNumWordsByLevel(package_id, level) {
    const [rows] = await global.dbConnection.execute(
      `SELECT COUNT(*) AS num_words
                 FROM learning
                 WHERE package_id = ? AND level = ?`,
      [package_id, level]
    );
    return rows[0].num_words;
  }

  async findWordsTodayToLearnAllPackages(user_id) {
    const [rows] = await global.dbConnection.execute(
      `SELECT l.detail_id, p.package_id, p.package_name
                 FROM learning l
                 JOIN packages p ON l.package_id = p.package_id
                 JOIN users u ON p.user_id = u.id
                 WHERE u.id = ? AND p.is_active = true
                   AND (
                       (level = 'x' AND DATE_ADD(DATE(date_memorized), INTERVAL 0 DAY) <= CURDATE()) OR
                       (level = '0' AND DATE_ADD(DATE(date_memorized), INTERVAL 2 DAY) <= CURDATE()) OR
                       (level = '1' AND DATE_ADD(DATE(date_memorized), INTERVAL 4 DAY) <= CURDATE()) OR
                       (level = '2' AND DATE_ADD(DATE(date_memorized), INTERVAL 10 DAY) <= CURDATE()) OR
                       (level = 'v' AND DATE_ADD(DATE(date_memorized), INTERVAL 20 DAY) <= CURDATE())
                   );`,
      [user_id]
    );
    return rows;
  }

  async findWordsTodayToLearn(package_id) {
    const [rows] = await global.dbConnection.execute(
      `SELECT detail_id, package_id
                 FROM learning
                 WHERE package_id = ?
                   AND (
                       (level = 'x' AND DATE_ADD(DATE(date_memorized), INTERVAL 0 DAY) <= CURDATE()) OR
                       (level = '0' AND DATE_ADD(DATE(date_memorized), INTERVAL 2 DAY) <= CURDATE()) OR
                       (level = '1' AND DATE_ADD(DATE(date_memorized), INTERVAL 4 DAY) <= CURDATE()) OR
                       (level = '2' AND DATE_ADD(DATE(date_memorized), INTERVAL 10 DAY) <= CURDATE()) OR
                       (level = 'v' AND DATE_ADD(DATE(date_memorized), INTERVAL 20 DAY) <= CURDATE())
                   );`,
      [package_id]
    );
    return rows;
  }

  async findWordsTodayByLevel(package_id, level) {
    const intervalDate = this.getInterval(level);

    const [rows] = await global.dbConnection.execute(
      `SELECT detail_id
                 FROM learning
                 WHERE package_id = ? AND level = ? 
                 AND DATE_ADD(DATE(date_memorized), INTERVAL ? DAY) <= CURDATE()`,
      [package_id, level, intervalDate]
    );
    return rows;
  }

  async findWordsByLevel(package_id, levelGame) {
    const intervalDate = this.getInterval(levelGame);
    const [rows] = await global.dbConnection.execute(
      `SELECT detail_id
                 FROM learning
                 WHERE package_id = ?
                   AND level = ?
                   AND DATE_ADD(DATE(date_memorized), INTERVAL ? DAY) <= CURDATE()`,
      [package_id, levelGame, intervalDate]
    );
    return rows;
  }

  async findWordsWithDetailsByLevel(package_id, levelGame) {
    const intervalDate = this.getInterval(levelGame);
    const [rows] = await global.dbConnection.execute(
      `SELECT wd.detail_id AS id, w.word, w.language_code, w.subject,
              wd.type, wd.meaning, wd.synonyms, wd.antonyms,
              wd.example, wd.grammar, wd.pronunciation,
              ln.level, ln.package_id
       FROM words w
       JOIN word_details wd ON w.word_id = wd.word_id
       JOIN learning ln ON wd.detail_id = ln.detail_id
       WHERE ln.package_id = ? AND ln.level = ?
         AND DATE_ADD(DATE(ln.date_memorized), INTERVAL ? DAY) <= CURDATE()`,
      [package_id, levelGame, intervalDate]
    );
    return rows;
  }

  async countWordsToReviewTodayByPackage(user_id) {
    const [rows] = await global.dbConnection.execute(
      `SELECT COUNT(*) AS num_words, p.package_id, p.package_name
                 FROM learning l
                 JOIN packages p ON l.package_id = p.package_id
                 WHERE p.user_id = ? AND p.is_active = true
                   AND (
                       (l.level = 'x' AND DATE_ADD(DATE(l.date_memorized), INTERVAL 0 DAY) <= CURDATE()) OR
                       (l.level = '0' AND DATE_ADD(DATE(l.date_memorized), INTERVAL 2 DAY) <= CURDATE()) OR
                       (l.level = '1' AND DATE_ADD(DATE(l.date_memorized), INTERVAL 4 DAY) <= CURDATE()) OR
                       (l.level = '2' AND DATE_ADD(DATE(l.date_memorized), INTERVAL 10 DAY) <= CURDATE()) OR
                       (l.level = 'v' AND DATE_ADD(DATE(l.date_memorized), INTERVAL 20 DAY) <= CURDATE())
                   )
                 GROUP BY p.package_id, p.package_name;`,
      [user_id]
    );
    return rows;
  }

  async countUserWordsByLevel(package_id, level) {
    const intervalDate = this.getInterval(level);
    const [rows] = await global.dbConnection.execute(
      `SELECT COUNT(*) AS num_words
                 FROM learning
                 WHERE package_id = ? AND level = ?
                 AND DATE_ADD(DATE(date_memorized), INTERVAL ? DAY) <= CURDATE()`,
      [package_id, level, intervalDate]
    );
    return rows[0].num_words;
  }

  async findRandomWordsExcluding(package_id, excludeDetailId, _limit = 1, levelGame) {
    const intervalDate = this.getInterval(levelGame);

    let query;
    let params;

    if (excludeDetailId) {
      query =
        'SELECT wd.detail_id, w.word_id, w.word, wd.meaning, wd.example, wd.pronunciation ' +
        'FROM words w ' +
        'JOIN word_details wd ON w.word_id = wd.word_id ' +
        'JOIN learning ln ON wd.detail_id = ln.detail_id ' +
        'WHERE ln.package_id = ? AND wd.detail_id != ? AND ln.level = ? ' +
        'AND DATE_ADD(DATE(ln.date_memorized), INTERVAL ? DAY) <= CURDATE()' +
        'ORDER BY RAND() LIMIT 1';
      params = [package_id, excludeDetailId, levelGame, intervalDate];
    } else {
      query =
        'SELECT wd.detail_id,w.word_id, w.word, wd.meaning, wd.example, wd.pronunciation ' +
        'FROM words w ' +
        'JOIN word_details wd ON w.word_id = wd.word_id ' +
        'JOIN learning ln ON wd.detail_id = ln.detail_id ' +
        'WHERE ln.package_id = ? AND ln.level = ? ' +
        'AND DATE_ADD(DATE(ln.date_memorized), INTERVAL ? DAY) <= CURDATE()' +
        'ORDER BY RAND() LIMIT 1';
      params = [package_id, levelGame, intervalDate];
    }

    const [words] = await global.dbConnection.execute(query, params);

    return words;
  }

  async getRandomUserWords(package_id, limit = 5, levelGame) {
    const limitInt = parseInt(limit, 10);
    const intervalDate = this.getInterval(levelGame);

    const query = `SELECT wd.detail_id, w.word_id, w.word, wd.meaning 
                    FROM words w 
                    JOIN word_details wd ON w.word_id = wd.word_id
                    JOIN learning ln ON wd.detail_id = ln.detail_id 
                    WHERE ln.package_id = ? AND ln.level = ? 
                    AND DATE_ADD(DATE(ln.date_memorized), INTERVAL ? DAY) <= CURDATE()
                    AND LENGTH(w.word) < 14 
                    ORDER BY RAND() LIMIT ${limitInt}`;

    const [words] = await global.dbConnection.execute(query, [package_id, levelGame, intervalDate]);

    return words;
  }
}
module.exports = new Learning();
