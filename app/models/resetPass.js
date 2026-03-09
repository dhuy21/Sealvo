const crypto = require('crypto');

class ResetPassword {
  createResetPasswordToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    return { token, expiresAt };
  }

  async saveResetPasswordToken(email, token, expiresAt) {
    await global.dbConnection.execute('DELETE FROM reset_password WHERE email = ?', [email]);
    const [result] = await global.dbConnection.execute(
      'INSERT INTO reset_password (email, token, expires_at) VALUES (?, ?, ?)',
      [email, token, expiresAt]
    );
    return result.affectedRows > 0;
  }

  async getResetPasswordToken(email) {
    const [result] = await global.dbConnection.execute(
      'SELECT token, expires_at, used FROM reset_password WHERE email = ?',
      [email]
    );
    return result[0];
  }

  async findByToken(token) {
    const [result] = await global.dbConnection.execute(
      'SELECT email, token, expires_at, used FROM reset_password WHERE token = ? LIMIT 1',
      [token]
    );
    return result[0];
  }

  async markTokenAsUsed(token) {
    const [result] = await global.dbConnection.execute(
      'UPDATE reset_password SET used = TRUE WHERE token = ?',
      [token]
    );
    return result.affectedRows > 0;
  }
}

module.exports = new ResetPassword();
