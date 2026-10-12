/**
 * E2E – Page feedback (/feedback)
 *
 * Vérifie le formulaire et l'affichage du message d'erreur
 * lorsque les champs obligatoires sont vides (API 400).
 */

/* global document */

const { test, expect } = require('@playwright/test');

test.describe('Feedback page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/feedback');
  });

  test('feedback form contains type, subject, content and submit button', async ({ page }) => {
    await expect(page.locator('#feedback-type')).toBeVisible();
    await expect(page.locator('input[name="subject"]')).toBeVisible();
    await expect(page.locator('textarea[name="content"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Envoyer/i })).toBeVisible();
  });

  test('submitting with empty required fields shows error message', async ({ page }) => {
    // Bypass HTML5 validation so the form is actually submitted via fetch (API returns 400)
    await page.evaluate(() => {
      const form = document.querySelector('.feedback-form');
      if (form) {
        form.querySelectorAll('[required]').forEach((el) => el.removeAttribute('required'));
      }
    });
    await page.getByRole('button', { name: /Envoyer/i }).click();

    const alert = page.locator('#alert');
    await expect(alert).toBeVisible({ timeout: 5000 });
    await expect(alert).toHaveClass(/alert-error/);
    await expect(alert).toContainText(/validation invalides|champs obligatoires|remplir/i);
  });
});
