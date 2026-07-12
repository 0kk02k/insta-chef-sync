import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/');
    // Basic smoke test - page loads and has title
    const title = await page.title();
    expect(title).toBeTruthy();
    await expect(page.locator('h1')).toContainText('CookingCompiler');
  });
});
