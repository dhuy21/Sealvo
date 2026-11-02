import fs from 'node:fs';
import path from 'node:path';

const ENV_FILE = path.join(import.meta.dirname, '..', '..', '..', '.env');

/**
 * Loads the repository .env like the API does: real environment variables win, and `${NAME}`
 * references are expanded (process.loadEnvFile alone keeps them literal).
 */
export function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) return;
  const alreadySet = new Set(Object.keys(process.env));
  process.loadEnvFile(ENV_FILE);
  for (const [key, value] of Object.entries(process.env)) {
    if (alreadySet.has(key) || !value?.includes('${')) continue;
    process.env[key] = value.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] ?? '');
  }
}
