import { defineConfig, devices } from '@playwright/test';

// BASE_URL is set by CI per environment; defaults to production.
// Local: BASE_URL=http://localhost:3000 npx turbo test:e2e --filter=@sealvo/web
export default defineConfig({
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
