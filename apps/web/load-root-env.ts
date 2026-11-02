import path from 'node:path';
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';

// Next.js reads the .env files of apps/web only; the monorepo keeps a single .env at its root.
// Only the web's own variables are taken (NODE_ENV and the API secrets stay out of the web server),
// and variables already set in the environment win (containers pass API_URL at runtime).
const WEB_VARIABLES = ['API_URL'];

const fileEnv: Record<string, string> = {};
const result = dotenv.config({
  path: path.resolve(process.cwd(), '../../.env'),
  processEnv: fileEnv,
  quiet: true,
});
if (result.parsed) expand({ parsed: fileEnv, processEnv: fileEnv });

for (const key of WEB_VARIABLES) {
  if (fileEnv[key] !== undefined && process.env[key] === undefined) process.env[key] = fileEnv[key];
}
