/**
 * Kịch bản 1 – Smoke test: public pages
 *
 * Mục tiêu : vérifier que les pages publiques se chargent correctement
 * et que la navigation de base fonctionne (sans authentification).
 *
 * Lancez : npm run test:e2e
 * Contre localhost : BASE_URL=http://localhost:3000 npm run test:e2e
 */

const { test, expect } = require('@playwright/test');

test.describe('Public pages – smoke', () => {
  test('homepage loads with SEALVO branding', async ({ page }) => {
    await page.goto('/');

    // Title de la page
    await expect(page).toHaveTitle(/SealVo/i);

    // Le mot "SEALVO" est visible dans le hero (span.glow-text est unique dans le hero)
    await expect(page.locator('span.glow-text')).toBeVisible();
    await expect(page.locator('span.glow-text')).toHaveText('SEALVO');

    // Les deux CTA principaux sont présents
    await expect(page.getByRole('link', { name: /Get Started/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Login/i }).first()).toBeVisible();
  });

  test('clicking "Get Started" navigates to /login', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /Get Started/i }).click();

    // On doit atterrir sur /login
    await expect(page).toHaveURL(/\/login/);

    // Le formulaire de connexion est présent
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('/login page renders correctly', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveTitle(/SealVo/i);
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Lien vers la page d'inscription
    await expect(page.getByRole('link', { name: /S'inscrire/i })).toBeVisible();
  });
});
