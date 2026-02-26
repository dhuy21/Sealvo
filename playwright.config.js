const { defineConfig, devices } = require('@playwright/test');

/**
 * E2E config Playwright.
 *
 * Par défaut : teste contre la production (https://www.sealvo.it.com).
 * Pour tester en local : BASE_URL=http://localhost:3000 npm run test:e2e
 *
 * Les tests E2E ne tournent PAS dans le CI principal (ci.yml) car ils
 * nécessitent un serveur HTTP actif. Ils s'exécutent localement ou
 * dans un job dédié post-deploy.
 */
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.BASE_URL || 'https://www.sealvo.it.com',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
