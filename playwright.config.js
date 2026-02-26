const { defineConfig, devices } = require('@playwright/test');

/**
 * E2E config Playwright.
 *
 * Par défaut : teste contre la production (https://www.sealvo.it.com).
 * Pour tester en local : BASE_URL=http://localhost:3000 npm run test:e2e
 *
 * Dans CI : job "E2E (production)" dans ci-cd.yml, après le job Deploy (push main),
 * pour vérifier la production automatiquement. Workflow "E2E Production" reste
 * disponible pour exécution manuelle ou schedule.
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
