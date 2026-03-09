const { test, expect } = require('@playwright/test');

test.describe('Public pages – smoke', () => {
  test('homepage loads with SEALVO branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SealVo/i);
    await expect(page.locator('span.glow-text')).toBeVisible();
    await expect(page.locator('span.glow-text')).toHaveText('SEALVO');
    await expect(page.getByRole('link', { name: /Get Started/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Login/i }).first()).toBeVisible();
  });

  test('"Get Started" navigates to /login', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Get Started/i }).click();
    await expect(page).toHaveURL(/\/login/);
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

  test('"Learn More" navigates to /aboutme', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Learn More/i }).click();
    await expect(page).toHaveURL(/\/aboutme/);
    await expect(page.getByRole('heading', { name: /À propos de moi/ })).toBeVisible();
  });

  test('/aboutme page loads', async ({ page }) => {
    await page.goto('/aboutme');
    await expect(page).toHaveTitle(/À propos de moi|SealVo/i);
    await expect(page.getByRole('heading', { name: /À propos de moi/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'NGUYEN Dinh Huy' })).toBeVisible();
  });

  test('/feedback page loads with form', async ({ page }) => {
    await page.goto('/feedback');
    await expect(page).toHaveTitle(/Feedback|SealVo/i);
    await expect(page.getByRole('heading', { name: /Donnez votre avis/i })).toBeVisible();
    await expect(page.locator('#feedback-type')).toBeVisible();
    await expect(page.locator('input[name="subject"]')).toBeVisible();
    await expect(page.locator('textarea[name="content"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Envoyer/i })).toBeVisible();
  });

  test('/registre page loads with registration form', async ({ page }) => {
    await page.goto('/registre');
    await expect(page).toHaveTitle(/Inscription|SealVo/i);
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="password2"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /S'inscrire/i })).toBeVisible();
  });

  test('GET /health returns 200', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.db).toBe(true);
    expect(body).toHaveProperty('redis');
  });

  test('unknown route returns 404', async ({ page }) => {
    const res = await page.goto('/nonexistent-page-e2e-xyz-123');
    expect(res).not.toBeNull();
    expect(res.status()).toBe(404);
  });
});
