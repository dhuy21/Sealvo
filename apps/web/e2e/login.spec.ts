import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('form contains all expected elements', async ({ page }) => {
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.getByRole('link', { name: /S'inscrire/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Mot de passe oublié/i })).toBeVisible();
  });

  // toBeVisible() ignores opacity: auth.css starts these elements at opacity 0 until the reveal animation ends
  test('form is actually revealed (opacity 1)', async ({ page }) => {
    for (const selector of ['form > div', 'button[type="submit"]']) {
      await expect(page.locator(selector).first()).toHaveCSS('opacity', '1');
    }
  });

  // Invalid credentials trigger a DB read (SELECT) only — no writes.
  test('wrong credentials show error', async ({ page }) => {
    await page.locator('input[name="username"]').fill('e2e_invalid_user_xyz_9999');
    await page.locator('input[name="password"]').fill('wrong_password_e2e_9999');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/login/);

    const toast = page.getByRole('status');
    await expect(toast).toBeVisible();
    await expect(toast).not.toBeEmpty();
  });

  test('"S\'inscrire" link goes to /register', async ({ page }) => {
    await page.getByRole('link', { name: /S'inscrire/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('"Mot de passe oublié?" goes to /forgot-password', async ({ page }) => {
    await page.getByRole('link', { name: /Mot de passe oublié/i }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });
});
