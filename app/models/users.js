const crypto = require('crypto');

class User {
  generateUserId() {
    return crypto.randomBytes(4).toString('hex').substring(0, 7);
  }

  checkDbConnection() {
    if (!global.dbConnection) {
      throw new Error(
        "La connexion à la base de données n'est pas disponible. Veuillez vérifier la configuration et redémarrer l'application."
      );
    }
  }
  async getAllUsers() {
    this.checkDbConnection();
    const [rows] = await global.dbConnection.execute('SELECT * FROM users');
    return rows;
  }
  async findById(user_id) {
    this.checkDbConnection();
    const [rows] = await global.dbConnection.execute('SELECT * FROM users WHERE id = ?', [user_id]);
    return rows[0] || null;
  }
  async findUsernameById(user_id) {
    const [rows] = await global.dbConnection.execute('SELECT username FROM users WHERE id = ?', [
      user_id,
    ]);
    return rows[0] || null;
  }
  async findEmailById(user_id) {
    const [rows] = await global.dbConnection.execute('SELECT email FROM users WHERE id = ?', [
      user_id,
    ]);
    return rows[0] || null;
  }
  async findByEmail(email) {
    const [rows] = await global.dbConnection.execute(
      'SELECT id, username FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  }
  async findByUsername(username) {
    this.checkDbConnection();
    const [rows] = await global.dbConnection.execute(
      'SELECT id, username, password, email, ava, is_verified, last_login, created_at FROM users WHERE username = ?',
      [username]
    );
    return rows[0] || null;
  }

  async findStreakById(user_id) {
    const [rows] = await global.dbConnection.execute('SELECT streak FROM users WHERE id = ?', [
      user_id,
    ]);
    return rows[0] || null;
  }

  async create(userData) {
    this.checkDbConnection();
    let userId = this.generateUserId();

    // Vérifier si l'ID existe déjà (peu probable mais par sécurité)
    let existingUser = await this.findById(userId);

    while (existingUser) {
      userId = this.generateUserId();
      existingUser = await this.findById(userId);
    }

    const username = userData.username;
    const email = userData.email;
    const password = userData.password;
    const ava = userData.ava || 1; // Default avatar is 1

    await global.dbConnection.execute(
      'INSERT INTO users (id, username, email, password, ava) VALUES (?, ?, ?, ?, ?)',
      [userId, username, email, password, ava]
    );

    return userId;
  }

  async updateAvatar(id, ava) {
    const [result] = await global.dbConnection.execute('UPDATE users SET ava = ? WHERE id = ?', [
      ava,
      id,
    ]);
    return result.affectedRows > 0;
  }

  async update(id, userData) {
    const [result] = await global.dbConnection.execute(
      'UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?',
      [userData.username, userData.email, userData.password, id]
    );
    return result.affectedRows > 0;
  }

  async updateLastLogin(id) {
    const [result] = await global.dbConnection.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  async updateStreakUpdatedAt(id) {
    const [result] = await global.dbConnection.execute(
      'UPDATE users SET streak_updated_at = NOW() WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  async updateStreak(id, streak) {
    const [result] = await global.dbConnection.execute('UPDATE users SET streak = ? WHERE id = ?', [
      streak,
      id,
    ]);
    return result.affectedRows > 0;
  }

  async updatePassword(email, newPassword) {
    const [result] = await global.dbConnection.execute(
      'UPDATE users SET password = ? WHERE email = ?',
      [newPassword, email]
    );
    return result.affectedRows > 0;
  }

  async updateUserInfo(id, userData) {
    let updated = false;

    if (userData.username) {
      const [result] = await global.dbConnection.execute(
        'UPDATE users SET username = ? WHERE id = ?',
        [userData.username, id]
      );
      updated = updated || result.affectedRows > 0;
    }
    if (userData.email) {
      const [result] = await global.dbConnection.execute(
        'UPDATE users SET email = ? WHERE id = ?',
        [userData.email, id]
      );
      updated = updated || result.affectedRows > 0;
    }
    if (userData.ava) {
      const [result] = await global.dbConnection.execute('UPDATE users SET ava = ? WHERE id = ?', [
        userData.ava,
        id,
      ]);
      updated = updated || result.affectedRows > 0;
    }

    return updated;
  }
  async getStreakById(id) {
    const [rows] = await global.dbConnection.execute('SELECT streak FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  }
  async getDateUpdatedStreak(id) {
    const [rows] = await global.dbConnection.execute(
      'SELECT streak_updated_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }
  async getLastLogin(id) {
    const [rows] = await global.dbConnection.execute('SELECT last_login FROM users WHERE id = ?', [
      id,
    ]);
    return rows[0] || null;
  }
  async delete(id) {
    const [result] = await global.dbConnection.execute('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  async deleteUserNotVerified() {
    const [result] = await global.dbConnection.execute(
      'DELETE FROM users WHERE is_verified = FALSE AND DATE_ADD(DATE(created_at), INTERVAL 3 DAY) <= CURDATE()',
      []
    );
    return result.affectedRows > 0;
  }

  async updateUserVerified(id) {
    const [result] = await global.dbConnection.execute(
      'UPDATE users SET is_verified = TRUE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = new User();
