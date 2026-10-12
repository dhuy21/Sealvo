/**
 * E2E – Page d'inscription (/registre)
 *
 * Vérifie le rendu du formulaire, les liens et la validation côté client
 * (pas de création réelle de compte).
 */

const { test, expect } = require('@playwright/test');

test.describe('Registration page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/registre');
  });

  test('registration form contains all expected elements', async ({ page }) => {
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="password2"]')).toBeVisible();
    await expect(page.locator('input#terms')).toBeVisible();
    await expect(page.locator('.avatar-selection, .avatars-container').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /S'inscrire/i })).toBeVisible();
  });

  test('"Se connecter" link navigates to /login', async ({ page }) => {
    await page.getByRole('link', { name: /Se connecter/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('submitting with empty required fields stays on page (HTML5 validation)', async ({
    page,
  }) => {
    // Ne pas remplir les champs requis ; le submit peut être bloqué par la validation HTML5
    await page.getByRole('button', { name: /S'inscrire/i }).click();
    await expect(page).toHaveURL(/\/registre/);
  });

  test('page shows subtitle and terms link', async ({ page }) => {
    await expect(page.getByText(/Créez votre compte pour commencer/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /conditions d'utilisation/i })).toBeVisible();
  });
});
