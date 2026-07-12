# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication Flow >> should toggle between login and signup
- Location: e2e/auth.spec.ts:19:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[name="displayName"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('input[name="displayName"]')

```

```yaml
- region "Notifications (F8)":
  - list
- region "Notifications alt+T"
- img
- heading "CookingCompiler" [level=3]
- paragraph: Sammle und organisiere deine Rezepte
- tablist:
  - tab "Anmelden"
  - tab "Registrieren" [selected]
- tabpanel "Registrieren":
  - text: Einladungscode *
  - textbox "Einladungscode *":
    - /placeholder: z.B. COOKINGCOMPILER2026
  - paragraph: Du benötigst einen Einladungscode um dich zu registrieren.
  - text: Name
  - textbox "Name":
    - /placeholder: Dein vollständiger Name
  - text: E-Mail
  - textbox "E-Mail"
  - text: Passwort
  - textbox "Passwort"
  - text: Sprache
  - combobox: Deutsch
  - text: Maßeinheiten
  - combobox: Metrisch (g, kg, ml, l)
  - button "Registrieren"
  - text: Oder registrieren mit
  - button "Google":
    - img
    - text: Google
- contentinfo:
  - link "Impressum":
    - /url: /impressum
  - link "Datenschutz":
    - /url: /datenschutz
- img
- heading "Cookie-Einstellungen" [level=3]
- paragraph: Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung zu bieten. Notwendige Cookies ermöglichen grundlegende Funktionen, funktionale Cookies speichern deine Präferenzen.
- button "Alle akzeptieren"
- button "Nur notwendige"
- link "Einstellungen":
  - /url: /settings
  - img
  - text: Einstellungen
- paragraph:
  - text: Mehr Informationen in unserer
  - link "Datenschutzerklärung":
    - /url: /datenschutz
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Authentication Flow', () => {
  4  |   test('should show login page', async ({ page }) => {
  5  |     await page.goto('/auth');
  6  |     await expect(page.locator('h1')).toContainText('InstaChef');
  7  |   });
  8  | 
  9  |   test('should show error with invalid credentials', async ({ page }) => {
  10 |     await page.goto('/auth');
  11 |     await page.fill('input[type="email"]', 'invalid@example.com');
  12 |     await page.fill('input[type="password"]', 'wrongpassword');
  13 |     await page.click('button[type="submit"]');
  14 | 
  15 |     // Should show error message
  16 |     await expect(page.locator('.destructive')).toBeVisible();
  17 |   });
  18 | 
  19 |   test('should toggle between login and signup', async ({ page }) => {
  20 |     await page.goto('/auth');
  21 | 
  22 |     // Click on signup tab
  23 |     await page.click('text=Registrieren');
  24 | 
  25 |     // Should show signup fields
> 26 |     await expect(page.locator('input[name="displayName"]')).toBeVisible();
     |                                                             ^ Error: expect(locator).toBeVisible() failed
  27 |     await expect(page.locator('input[name="invitationCode"]')).toBeVisible();
  28 |   });
  29 | });
  30 | 
```