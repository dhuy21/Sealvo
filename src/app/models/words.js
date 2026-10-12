class Word {
  async findWordsByPackageId(package_id) {
    const [rows] = await global.dbConnection.execute(
      'SELECT wd.detail_id, w.word_id, w.word, w.language_code, wd.meaning, wd.type, wd.synonyms, wd.antonyms, wd.example, wd.grammar, wd.pronunciation, ln.level, ln.package_id ' +
        'FROM words w ' +
        'JOIN word_details wd ON w.word_id = wd.word_id ' +
        'JOIN learning ln ON wd.detail_id = ln.detail_id ' +
        'WHERE ln.package_id = ? ' +
        'ORDER BY w.word ASC',
      [package_id]
    );
    return rows;
  }

  /**
   * Compte le nombre de mots  d'un utilisateur dans tous ses packages
   * @param {string|number} userId - L'ID de l'utilisateur
   * @returns {Promise<number>} Le nombre de mots
   */
  async countUserWords(userId) {
    try {
      // Ensure userId is treated as a string since user_id is CHAR(7) in the database
      const userIdStr = String(userId);

      const [rows] = await global.dbConnection.execute(
        'SELECT COUNT(*) as count ' +
          'FROM learning l ' +
          'JOIN word_details wd ON l.detail_id = wd.detail_id ' +
          'JOIN words w ON wd.word_id = w.word_id ' +
          'JOIN packages p ON l.package_id = p.package_id ' +
          'WHERE p.user_id = ?',
        [userIdStr]
      );

      return rows[0].count;
    } catch {
      return 0;
    }
  }

  async create(wordData, package_id) {
    let transaction;
    try {
      transaction = await global.dbConnection.beginTransaction();
      let wordId;
      const [existingWord] = await transaction.execute(
        'SELECT word_id FROM words WHERE word = ? AND subject = ? AND language_code = ?',
        [wordData.word, wordData.subject, wordData.language_code]
      );
      if (existingWord.length === 0) {
        const [wordResult] = await transaction.execute(
          'INSERT INTO words (word, subject, language_code) VALUES (?, ?, ?)',
          [wordData.word, wordData.subject, wordData.language_code]
        );
        wordId = wordResult.insertId;
      } else {
        wordId = existingWord[0].word_id;
      }

      const [detailResult] = await transaction.execute(
        'INSERT INTO word_details (word_id, type, meaning, pronunciation, synonyms, antonyms, example, grammar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          wordId,
          wordData.type,
          wordData.meaning,
          wordData.pronunciation,
          wordData.synonyms,
          wordData.antonyms,
          wordData.example,
          wordData.grammar,
        ]
      );
      const detailId = detailResult.insertId;

      await transaction.execute(
        'INSERT INTO learning (package_id, detail_id, level) VALUES (?, ?, ?)',
        [package_id, detailId, wordData.level.toString()]
      );

      await transaction.commit();
      return wordId;
    } catch (error) {
      if (transaction) {
        try {
          await transaction.rollback();
        } catch {
          /* ignore */
        }
      }
      throw error;
    }
  }

  async deleteWord(detailId, packageId) {
    await global.dbConnection.execute(
      'DELETE FROM learning WHERE detail_id = ? AND package_id = ?',
      [detailId, packageId]
    );
    return true;
  }

  async deleteAllWords(packageId) {
    const [result] = await global.dbConnection.execute(
      'DELETE wd FROM word_details wd INNER JOIN learning l ON wd.detail_id = l.detail_id WHERE l.package_id = ?',
      [packageId]
    );
    return result.affectedRows;
  }

  async findUsersByWordId(detail_id) {
    const [rows] = await global.dbConnection.execute('SELECT * FROM learning WHERE detail_id = ?', [
      detail_id,
    ]);
    return rows[0] || null;
  }

  async findById(detailId) {
    const [rows] = await global.dbConnection.execute(
      'SELECT wd.detail_id as id, w.word, w.language_code, w.subject, wd.type, wd.meaning, wd.synonyms, wd.antonyms, ' +
        'wd.example, wd.grammar, wd.pronunciation, ln.level, ln.package_id ' +
        'FROM words w ' +
        'JOIN word_details wd ON w.word_id = wd.word_id ' +
        'JOIN learning ln ON wd.detail_id = ln.detail_id ' +
        'WHERE wd.detail_id = ?',
      [detailId]
    );
    return rows[0] || null;
  }

  async updateWord(wordData, detailId, packageId) {
    let transaction;
    try {
      transaction = await global.dbConnection.beginTransaction();

      const [currentDetails] = await transaction.execute(
        'SELECT wd.*, w.word, w.subject, w.language_code FROM word_details wd ' +
          'JOIN words w ON wd.word_id = w.word_id WHERE wd.detail_id = ?',
        [detailId]
      );

      if (!currentDetails.length) {
        throw new Error('Mot non trouvé');
      }

      const current = currentDetails[0];
      const wordChanged =
        current.word !== wordData.word || current.language_code !== wordData.language_code;

      let wordId = current.word_id;

      // 2. Si le mot de base a changé, gérer le nouveau mot
      if (wordChanged) {
        const [existingWord] = await transaction.execute(
          'SELECT word_id FROM words WHERE word = ? AND language_code = ?',
          [wordData.word, wordData.language_code]
        );

        if (existingWord.length === 0) {
          const [wordResult] = await transaction.execute(
            'INSERT INTO words (word, subject, language_code) VALUES (?, ?, ?)',
            [wordData.word, 'Daily', wordData.language_code]
          );
          wordId = wordResult.insertId;
        } else {
          wordId = existingWord[0].word_id;
        }

        await transaction.execute('UPDATE word_details SET word_id = ? WHERE detail_id = ?', [
          wordId,
          detailId,
        ]);
      }

      await transaction.execute(
        'UPDATE word_details SET type = ?, meaning = ?, pronunciation = ?, synonyms = ?, antonyms = ?, example = ?, grammar = ? WHERE detail_id = ?',
        [
          wordData.type,
          wordData.meaning,
          wordData.pronunciation,
          wordData.synonyms,
          wordData.antonyms,
          wordData.example,
          wordData.grammar,
          detailId,
        ]
      );

      await transaction.execute(
        'UPDATE learning SET level = ? WHERE detail_id = ? AND package_id = ?',
        [wordData.level, detailId, packageId]
      );

      await transaction.commit();

      return detailId;
    } catch (error) {
      if (transaction) {
        try {
          await transaction.rollback();
        } catch {
          /* ignore */
        }
      }
      throw error;
    }
  }
}

module.exports = new Word();
