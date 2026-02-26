/**
 * Kịch bản 2 – Login flow E2E
 *
 * Mục tiêu : vérifier le comportement du formulaire de connexion côté
 * navigateur (HTML5 validation, redirections, messages d'erreur).
 *
 * Ces tests ne nécessitent PAS de mocker la BDD : ils testent le vrai
 * comportement de l'application déployée (ou locale).
 */

const { test, expect } = require('@playwright/test');

test.describe('Login flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('login form contains all expected elements', async ({ page }) => {
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.getByRole('link', { name: /S'inscrire/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Mot de passe oublié/i })).toBeVisible();
  });

  test('submitting wrong credentials shows an error message', async ({ page }) => {
    // Identifiants volontairement invalides (utilisateur inexistant)
    await page.locator('input[name="username"]').fill('e2e_invalid_user_xyz_9999');
    await page.locator('input[name="password"]').fill('wrong_password_e2e_9999');

    await page.locator('button[type="submit"]').click();

    // Après redirect, on reste sur /login
    await expect(page).toHaveURL(/\/login/);

    // Un message d'alerte (flash) doit être affiché
    const alert = page.locator('.alert');
    await expect(alert).toBeVisible();
    await expect(alert).not.toBeEmpty();
  });

  test('clicking "S\'inscrire" navigates to /registre', async ({ page }) => {
    await page.getByRole('link', { name: /S'inscrire/i }).click();
    await expect(page).toHaveURL(/\/registre/);
  });

  test('"Mot de passe oublié?" link navigates to forgotPassword page', async ({ page }) => {
    await page.getByRole('link', { name: /Mot de passe oublié/i }).click();
    await expect(page).toHaveURL(/forgotPassword/);
  });
});
