import { test, expect } from '@playwright/test';

test.describe('Public pages – smoke', () => {
  test('homepage shows SEALVO branding and sends visitors to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SealVo/i);
    const header = page.getByRole('banner');
    await expect(header.getByRole('heading', { name: 'SEALVO' })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await expect(header.getByRole('link', { name: 'Sign In' })).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('/login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/SealVo/i);
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.getByRole('link', { name: /S'inscrire/i })).toBeVisible();
  });

  test('"About" nav link navigates to /about', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('banner').getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(/\/about/);
    await expect(page.getByRole('heading', { name: /À propos de moi/ })).toBeVisible();
  });

  test('/about page loads', async ({ page }) => {
    await page.goto('/about');
    await expect(page).toHaveTitle(/SealVo/i);
    await expect(page.getByRole('heading', { name: /À propos de moi/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'NGUYEN Dinh Huy' })).toBeVisible();
  });

  test('/feedback page loads with form', async ({ page }) => {
    await page.goto('/feedback');
    await expect(page).toHaveTitle(/SealVo/i);
    await expect(page.getByRole('heading', { name: /Donnez votre avis/i })).toBeVisible();
    await expect(page.getByLabel('Type de feedback')).toBeVisible();
    await expect(page.getByLabel('Sujet')).toBeVisible();
    await expect(page.getByLabel('Détails')).toBeVisible();
    await expect(page.getByRole('button', { name: /Envoyer/i })).toBeVisible();
  });

  test('/register page loads with registration form', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveTitle(/SealVo/i);
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="password2"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('unknown route returns 404', async ({ page }) => {
    const res = await page.goto('/nonexistent-page-e2e-xyz-123');
    expect(res).not.toBeNull();
    expect(res!.status()).toBe(404);
  });
});
