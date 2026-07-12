import { test, expect } from '@playwright/test';

test.describe('Instagram URL Blocking', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication (would need real user in production)
    await page.goto('/');
  });

  test('should warn about Instagram URLs in upload zone', async ({ page }) => {
    await page.goto('/');

    // Try to paste Instagram URL
    await page.click('[data-testid="upload-zone"]');
    await page.keyboard.type('https://www.instagram.com/p/ABC123/');

    // Should show warning
    await expect(page.locator('text=Instagram URLs werden nicht unterstützt')).toBeVisible();
  });

  test('should not block non-Instagram URLs', async ({ page }) => {
    await page.goto('/');

    // Try to paste normal URL
    await page.click('[data-testid="upload-zone"]');
    await page.keyboard.type('https://example.com/recipe');

    // Should NOT show warning
    await expect(page.locator('text=Instagram URLs werden nicht unterstützt')).not.toBeVisible();
  });
});
