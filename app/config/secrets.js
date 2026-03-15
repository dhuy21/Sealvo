const { isProductionLike } = require('./environment');

const MIN_SESSION_SECRET_LEN = 32;
const MIN_CRON_SECRET_LEN = 16;

const RULES = [
  {
    key: 'SESSION_SECRET',
    minLength: MIN_SESSION_SECRET_LEN,
    reason: 'Sessions will be invalidated on every restart and are vulnerable to prediction.',
  },
  {
    key: 'CRON_SECRET',
    minLength: MIN_CRON_SECRET_LEN,
    reason: 'Cron endpoints will be unprotected.',
  },
];

function validateSecrets() {
  const errors = [];

  for (const { key, minLength, reason } of RULES) {
    const value = process.env[key];

    if (!value) {
      errors.push(`${key} is not set. ${reason}`);
    } else if (value.length < minLength) {
      errors.push(`${key} is too short (${value.length} chars, minimum ${minLength}). ${reason}`);
    }
  }

  if (errors.length === 0) return;

  const banner = `\n[security] Secret validation failed:\n  - ${errors.join('\n  - ')}\n`;

  if (isProductionLike()) {
    console.error(banner);
    process.exit(1);
  }

  console.warn(banner + '  (ignored in development)\n');
}

module.exports = { validateSecrets };
