import { test, expect } from '@playwright/test';

test.describe('Auth pages – extended', () => {
  // ── Forgot password page ──────────────────────────────────
  test.describe('/forgot-password', () => {
    test('page loads with email input and submit button', async ({ page }) => {
      await page.goto('/forgot-password');
      await expect(page).toHaveTitle(/SealVo/i);
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('has a link back to the login page', async ({ page }) => {
      await page.goto('/forgot-password');
      const loginLink = page
        .getByRole('main')
        .getByRole('link', { name: /connexion|login|retour/i });
      await expect(loginLink).toBeVisible();
      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    });
  });

  // ── Reset password page ───────────────────────────────────
  test.describe('/reset-password', () => {
    test('page loads with password fields when token param is provided', async ({ page }) => {
      await page.goto('/reset-password?token=test-token-e2e');
      await expect(page).toHaveTitle(/SealVo/i);
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
    });
  });

  // ── Login page extended ───────────────────────────────────
  test.describe('/login extended', () => {
    test('"Mot de passe oublié?" link is on the login page', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('link', { name: /mot de passe oublié/i })).toBeVisible();
    });

    test('login form rejects empty submission (client-side validation)', async ({ page }) => {
      await page.goto('/login');
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.locator('input[name="username"]')).toBeVisible();
    });
  });

  // ── Registration page extended ────────────────────────────
  test.describe('/register extended', () => {
    test('avatar selector is present', async ({ page }) => {
      await page.goto('/register');
      await expect(page.getByAltText(/^Avatar \d+$/).first()).toBeVisible();
    });
  });
});
