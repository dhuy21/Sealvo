/**
 * E2E – Protected pages with the seeded account (apps/api/prisma/seed.mjs)
 *
 * Skipped when E2E_USERNAME / E2E_PASSWORD are unset (environment without a seeded account).
 * Logs in once for the whole file: the login route allows 10 attempts per 15 minutes per IP.
 * Read-only: no game is finished, so the seeded words stay at level x.
 */

import { test, expect, type Page } from '@playwright/test';

const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;

// Must match apps/api/prisma/seed.mjs
const PACKAGE_NAME = 'E2E Package';
const SEEDED_WORDS = ['apple', 'book', 'house', 'water', 'friend', 'garden', 'window', 'bridge'];

test.skip(!username || !password, 'E2E_USERNAME / E2E_PASSWORD not set');

test.describe.configure({ mode: 'serial' });

let page: Page;
let packageId: string;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  await page.goto('/login');
  await page.locator('input[name="username"]').fill(username!);
  await page.locator('input[name="password"]').fill(password!);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test.afterAll(async () => {
  await page?.close();
});

test('dashboard loads with the username', async () => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Tableau de Bord' })).toBeVisible();
  await expect(page.locator('[class*="dashboard-welcome"]')).toContainText(username!);
});

test('packages list shows the seeded package', async () => {
  await page.goto('/packages');
  const card = page.locator('[data-package-id]', { hasText: PACKAGE_NAME });
  await expect(card).toBeVisible();
  packageId = (await card.getAttribute('data-package-id'))!;
  expect(packageId).toMatch(/^\d+$/);
});

test('words page lists the seeded words', async () => {
  await page.goto(`/words?package=${packageId}`);
  for (const word of SEEDED_WORDS) {
    await expect(page.getByRole('cell', { name: word, exact: true })).toBeVisible();
  }
});

test('words page links to the add-words page', async () => {
  await page.goto(`/words?package=${packageId}`);
  await page.getByRole('link', { name: /Ajouter un nouveau mot/ }).click();
  await expect(page).toHaveURL(new RegExp(`/words/add\\?package=${packageId}$`));
  await expect(page.getByRole('heading', { name: 'Ajouter un nouveau mot' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nouveau mot', exact: true })).toHaveCount(1);
});

test('Flash Match starts with the due words', async () => {
  await page.goto(`/games/flash-match?package=${packageId}`);
  await page.getByRole('button', { name: /Commencer/ }).click();
  // One word card and one meaning card per word (at most 15 pairs)
  await expect(page.locator('[class*="_game-board"] [class*="_card-container"]')).toHaveCount(
    SEEDED_WORDS.length * 2,
  );
  await expect(page.locator('[class*="_pairs-value"]')).toHaveText(`0/${SEEDED_WORDS.length}`);
});
