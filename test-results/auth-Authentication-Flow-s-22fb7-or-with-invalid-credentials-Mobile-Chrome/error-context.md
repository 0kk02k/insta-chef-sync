# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication Flow >> should show error with invalid credentials
- Location: e2e/auth.spec.ts:9:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button[type="submit"]')
    - locator resolved to <button type="submit" data-lov-name="Button" data-component-line="313" data-component-name="Button" data-component-file="Auth.tsx" data-lov-id="src/pages/Auth.tsx:313:16" data-component-path="src/pages/Auth.tsx" data-component-content="%7B%22text%22%3A%22Anmelden%22%2C%22className%22%3A%22w-full%22%7D" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visib…>Anmelden</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <p data-lov-name="p" data-component-name="p" data-component-line="25" class="text-sm text-muted-foreground" data-component-file="CookieBanner.tsx" data-lov-id="src/components/CookieBanner.tsx:25:16" data-component-path="src/components/CookieBanner.tsx" data-component-content="%7B%22text%22%3A%22Wir%20verwenden%20Cookies%2C%20um%20Ihnen%20die%20bestm%C3%B6gliche%20Erfahrung%20zu%20bieten.%20%5Cn%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20Notwendige%20Cookies%20erm%C3%B6glichen%20grundleg…>Wir verwenden Cookies, um Ihnen die bestmögliche …</p> from <div data-lov-name="div" data-component-line="17" data-component-name="div" data-component-file="CookieBanner.tsx" data-lov-id="src/components/CookieBanner.tsx:17:4" data-component-path="src/components/CookieBanner.tsx" class="fixed bottom-4 left-4 right-4 z-50 flex justify-center" data-component-content="%7B%22className%22%3A%22fixed%20bottom-4%20left-4%20right-4%20z-50%20flex%20justify-center%22%7D">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <p data-lov-name="p" data-component-name="p" data-component-line="25" class="text-sm text-muted-foreground" data-component-file="CookieBanner.tsx" data-lov-id="src/components/CookieBanner.tsx:25:16" data-component-path="src/components/CookieBanner.tsx" data-component-content="%7B%22text%22%3A%22Wir%20verwenden%20Cookies%2C%20um%20Ihnen%20die%20bestm%C3%B6gliche%20Erfahrung%20zu%20bieten.%20%5Cn%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20Notwendige%20Cookies%20erm%C3%B6glichen%20grundleg…>Wir verwenden Cookies, um Ihnen die bestmögliche …</p> from <div data-lov-name="div" data-component-line="17" data-component-name="div" data-component-file="CookieBanner.tsx" data-lov-id="src/components/CookieBanner.tsx:17:4" data-component-path="src/components/CookieBanner.tsx" class="fixed bottom-4 left-4 right-4 z-50 flex justify-center" data-component-content="%7B%22className%22%3A%22fixed%20bottom-4%20left-4%20right-4%20z-50%20flex%20justify-center%22%7D">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    57 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <p data-lov-name="p" data-component-name="p" data-component-line="25" class="text-sm text-muted-foreground" data-component-file="CookieBanner.tsx" data-lov-id="src/components/CookieBanner.tsx:25:16" data-component-path="src/components/CookieBanner.tsx" data-component-content="%7B%22text%22%3A%22Wir%20verwenden%20Cookies%2C%20um%20Ihnen%20die%20bestm%C3%B6gliche%20Erfahrung%20zu%20bieten.%20%5Cn%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20Notwendige%20Cookies%20erm%C3%B6glichen%20grundleg…>Wir verwenden Cookies, um Ihnen die bestmögliche …</p> from <div data-lov-name="div" data-component-line="17" data-component-name="div" data-component-file="CookieBanner.tsx" data-lov-id="src/components/CookieBanner.tsx:17:4" data-component-path="src/components/CookieBanner.tsx" class="fixed bottom-4 left-4 right-4 z-50 flex justify-center" data-component-content="%7B%22className%22%3A%22fixed%20bottom-4%20left-4%20right-4%20z-50%20flex%20justify-center%22%7D">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - img [ref=e9]
        - heading "CookingCompiler" [level=3] [ref=e11]
        - paragraph [ref=e12]: Sammle und organisiere deine Rezepte
      - generic [ref=e14]:
        - tablist [ref=e15]:
          - tab "Anmelden" [selected] [ref=e16] [cursor=pointer]
          - tab "Registrieren" [ref=e17] [cursor=pointer]
        - tabpanel "Anmelden" [ref=e18]:
          - generic [ref=e19]:
            - generic [ref=e20]:
              - text: E-Mail
              - textbox "E-Mail" [ref=e21]: invalid@example.com
            - generic [ref=e22]:
              - text: Passwort
              - textbox "Passwort" [active] [ref=e23]: wrongpassword
            - button "Anmelden" [ref=e24] [cursor=pointer]
            - generic [ref=e28]: Oder anmelden mit
            - button "Google" [ref=e29] [cursor=pointer]:
              - img
              - text: Google
            - button "Passwort vergessen?" [ref=e31] [cursor=pointer]
    - contentinfo [ref=e32]:
      - generic [ref=e34]:
        - link "Impressum" [ref=e35] [cursor=pointer]:
          - /url: /impressum
        - link "Datenschutz" [ref=e37] [cursor=pointer]:
          - /url: /datenschutz
  - generic [ref=e41]:
    - img [ref=e42]
    - generic [ref=e44]:
      - generic [ref=e45]:
        - heading "Cookie-Einstellungen" [level=3] [ref=e46]
        - paragraph [ref=e47]: Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung zu bieten. Notwendige Cookies ermöglichen grundlegende Funktionen, funktionale Cookies speichern deine Präferenzen.
      - generic [ref=e48]:
        - button "Alle akzeptieren" [ref=e49] [cursor=pointer]
        - button "Nur notwendige" [ref=e50] [cursor=pointer]
        - link "Einstellungen" [ref=e51] [cursor=pointer]:
          - /url: /settings
          - img
          - text: Einstellungen
      - paragraph [ref=e52]:
        - text: Mehr Informationen in unserer
        - link "Datenschutzerklärung" [ref=e53] [cursor=pointer]:
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
> 13 |     await page.click('button[type="submit"]');
     |                ^ Error: page.click: Test timeout of 30000ms exceeded.
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
  26 |     await expect(page.locator('input[name="displayName"]')).toBeVisible();
  27 |     await expect(page.locator('input[name="invitationCode"]')).toBeVisible();
  28 |   });
  29 | });
  30 | 
```