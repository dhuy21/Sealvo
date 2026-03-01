const { test, expect } = require('@playwright/test');

test.describe('Auth pages – extended', () => {
  // ── Forgot password page ──────────────────────────────────
  test.describe('/login/forgotPassword', () => {
    test('page loads with email input and submit button', async ({ page }) => {
      await page.goto('/login/forgotPassword');
      await expect(page).toHaveTitle(/SealVo/i);
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('has a link back to the login page', async ({ page }) => {
      await page.goto('/login/forgotPassword');
      const loginLink = page.getByRole('link', { name: /connexion|login|retour/i });
      await expect(loginLink).toBeVisible();
      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    });
  });

  // ── Reset password page ───────────────────────────────────
  test.describe('/login/resetPassword', () => {
    test('page loads with password fields when token param is provided', async ({ page }) => {
      await page.goto('/login/resetPassword?token=test-token-e2e');
      await expect(page).toHaveTitle(/SealVo/i);
      // Should have at least one password input
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
    });
  });

  // ── Login page extended ───────────────────────────────────
  test.describe('/login extended', () => {
    test('"Mot de passe oublié?" link is on the login page', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('link', { name: /mot de passe oublié/i })).toBeVisible();
    });

    test('login form rejects empty submission (HTML5 validation)', async ({ page }) => {
      await page.goto('/login');
      await page.locator('button[type="submit"]').click();
      // Should still be on /login (HTML5 validation or server-side redirect)
      await expect(page).toHaveURL(/\/login/);
    });
  });

  // ── Registration page extended ────────────────────────────
  test.describe('/registre extended', () => {
    test('avatar selector is present', async ({ page }) => {
      await page.goto('/registre');
      // Avatar options (radio inputs or image buttons)
      const avatarInputs = page.locator('input[name="avatar"]');
      await expect(avatarInputs.first()).toBeVisible();
    });
  });
});
