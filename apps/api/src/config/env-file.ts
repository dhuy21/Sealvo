import { fileURLToPath } from 'url';

// Repository root .env, same depth from src/config (tests) and dist/config (runtime), independent of the cwd.
// Deployed environments have no file: their variables come from the platform.
export const ENV_FILE = fileURLToPath(new URL('../../../../.env', import.meta.url));
