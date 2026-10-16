/**
 * E2E – Registration page (/register)
 *
 * Checks the form, links and client-side validation only: no account is created,
 * so the suite can run against any deployed environment.
 */

import { test, expect } from '@playwright/test';

test.describe('Registration page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('registration form contains all expected elements', async ({ page }) => {
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="password2"]')).toBeVisible();
    await expect(page.locator('input[name="terms"]')).toBeVisible();
    await expect(page.getByAltText(/^Avatar \d+$/).first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('"Se connecter" link navigates to /login', async ({ page }) => {
    await page.getByRole('link', { name: 'Se connecter', exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('submitting with empty required fields stays on page (client-side validation)', async ({
    page,
  }) => {
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('page shows heading and terms link', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Inscription' })).toBeVisible();
    await expect(page.getByRole('link', { name: /conditions d'utilisation/i })).toHaveAttribute(
      'href',
      '/terms',
    );
  });
});
