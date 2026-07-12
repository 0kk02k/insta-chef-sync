import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('h1')).toContainText('InstaChef');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('.destructive')).toBeVisible();
  });

  test('should toggle between login and signup', async ({ page }) => {
    await page.goto('/auth');

    // Click on signup tab
    await page.click('text=Registrieren');

    // Should show signup fields
    await expect(page.locator('input[name="displayName"]')).toBeVisible();
    await expect(page.locator('input[name="invitationCode"]')).toBeVisible();
  });
});
