/**
 * E2E – Feedback page (/feedback)
 *
 * Checks the form and the validation errors shown when required fields are empty
 * (client-side zod validation: nothing is sent to the API).
 */

import { test, expect } from '@playwright/test';

test.describe('Feedback page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/feedback');
  });

  test('feedback form contains type, subject, content, email and submit button', async ({
    page,
  }) => {
    await expect(page.getByLabel('Type de feedback')).toBeVisible();
    await expect(page.getByLabel('Sujet')).toBeVisible();
    await expect(page.getByLabel('Détails')).toBeVisible();
    await expect(page.getByLabel(/Email/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Envoyer/i })).toBeVisible();
  });

  test('submitting with empty required fields shows error messages', async ({ page }) => {
    await page.getByRole('button', { name: /Envoyer/i }).click();

    await expect(page.getByText('Sujet requis')).toBeVisible();
    await expect(page.getByText('Détails requis')).toBeVisible();
  });
});
