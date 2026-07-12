import { test, expect } from '@playwright/test';

test.describe.skip('Recipe Creation Flow - needs auth mock', () => {
  test('should show recipe creation dialog', async ({ page }) => {
    await page.goto('/');

    // Click add recipe button
    const addButton = page.locator('button:has-text("Rezept")').first();
    await addButton.click();

    // Should show dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should upload image file', async ({ page }) => {
    await page.goto('/');

    // Click add recipe
    const addButton = page.locator('button:has-text("Rezept")').first();
    await addButton.click();

    // Upload file (would need actual file)
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();
  });

  test('should show text input option', async ({ page }) => {
    await page.goto('/');

    const addButton = page.locator('button:has-text("Rezept")').first();
    await addButton.click();

    // Should have paste option
    await expect(page.locator('text=Text einfügen')).toBeVisible();
  });
});
