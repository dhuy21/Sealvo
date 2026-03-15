const crypto = require('crypto');
const { getClient, isReady } = require('../core/redis');

const TOKEN_PREFIX = 'reset:';
const EMAIL_PREFIX = 'reset:email:';
const TOKEN_TTL = 3600; // 1 hour

class ResetPassword {
  createResetPasswordToken() {
    const token = crypto.randomBytes(32).toString('hex');
    return { token };
  }

  _hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async saveResetPasswordToken(email, token) {
    if (!isReady()) return false;

    const tokenHash = this._hashToken(token);
    const client = getClient();

    try {
      const oldHash = await client.get(EMAIL_PREFIX + email);
      if (oldHash) await client.del(TOKEN_PREFIX + oldHash);

      await client.set(TOKEN_PREFIX + tokenHash, JSON.stringify({ email }), { EX: TOKEN_TTL });
      await client.set(EMAIL_PREFIX + email, tokenHash, { EX: TOKEN_TTL });
      return true;
    } catch (err) {
      console.error('[ResetPassword] Redis save failed:', err.message);
      return false;
    }
  }

  async findByToken(token) {
    if (!isReady()) return null;

    const tokenHash = this._hashToken(token);

    try {
      const raw = await getClient().get(TOKEN_PREFIX + tokenHash);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.error('[ResetPassword] Redis lookup failed:', err.message);
      return null;
    }
  }

  async markTokenAsUsed(token) {
    if (!isReady()) return false;

    const tokenHash = this._hashToken(token);
    const client = getClient();

    try {
      const raw = await client.get(TOKEN_PREFIX + tokenHash);
      if (raw) {
        const { email } = JSON.parse(raw);
        await client.del([TOKEN_PREFIX + tokenHash, EMAIL_PREFIX + email]);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[ResetPassword] Redis delete failed:', err.message);
      return false;
    }
  }
}

module.exports = new ResetPassword();
