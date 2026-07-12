# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: instagram-block.spec.ts >> Instagram URL Blocking >> should warn about Instagram URLs in upload zone
- Location: e2e/instagram-block.spec.ts:9:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-testid="upload-zone"]')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - img [ref=e9]
          - generic [ref=e11]:
            - heading "CookingCompiler" [level=1] [ref=e12]
            - paragraph [ref=e13]: KI-gestützte Rezepteverwaltung
        - button "Login" [ref=e15] [cursor=pointer]:
          - img
          - generic [ref=e16]: Login
    - generic [ref=e17]:
      - generic [ref=e19]:
        - generic [ref=e20]:
          - img [ref=e21]
          - textbox "Rezepte durchsuchen (Titel, Beschreibung, Zutaten, Tags)..." [ref=e24]
        - generic [ref=e26]:
          - img [ref=e27]
          - textbox "Nach Benutzer suchen..." [ref=e32]
      - generic [ref=e34]:
        - generic [ref=e37] [cursor=pointer]:
          - img "Gerösteter Wirsing mit Anchoïade und Chili-Bröseln" [ref=e39]
          - generic [ref=e41]:
            - heading "Gerösteter Wirsing mit Anchoïade und Chili-Bröseln" [level=3] [ref=e42]
            - generic [ref=e44]:
              - img [ref=e45]
              - text: "4"
            - paragraph [ref=e51]: Gerösteter Wirsing mit einer würzigen Anchoïade-Sauce und knusprigen Chili-Bröseln als vegetarische Beilage.
        - generic [ref=e54] [cursor=pointer]:
          - img "Dumpling-Lasagne" [ref=e56]
          - generic [ref=e58]:
            - heading "Dumpling-Lasagne" [level=3] [ref=e59]
            - generic [ref=e60]:
              - generic [ref=e61]:
                - img [ref=e62]
                - text: "5"
              - generic [ref=e64]:
                - img [ref=e65]
                - text: 25m
              - generic [ref=e68]:
                - img [ref=e69]
                - text: "1"
            - paragraph [ref=e75]: Eine schichtige Lasagne mit saftigem Schweinehackfleisch und Teigwaren, inspiriert von Suppendumplings. Einfach zuzubereiten, voller Umami-Geschmack und ohne Falten der Teigwaren.
        - generic [ref=e78] [cursor=pointer]:
          - img "Bœuf Bourguignon Rezept – original französisch & unkompliziert" [ref=e80]
          - generic [ref=e82]:
            - heading "Bœuf Bourguignon Rezept – original französisch & unkompliziert" [level=3] [ref=e83]
            - generic [ref=e84]:
              - generic [ref=e85]:
                - img [ref=e86]
                - text: 180m
              - generic [ref=e89]:
                - img [ref=e90]
                - text: "6"
            - paragraph [ref=e96]: Original französisches Bœuf Bourguignon – mit zartem Fleisch und kräftiger Rotweinsauce. Ein Klassiker, einfach gemacht!
        - generic [ref=e99] [cursor=pointer]:
          - img "Fesenjan Schmorgericht" [ref=e101]
          - generic [ref=e103]:
            - heading "Fesenjan Schmorgericht" [level=3] [ref=e104]
            - generic [ref=e105]:
              - generic [ref=e106]:
                - img [ref=e107]
                - text: 60m
              - generic [ref=e110]:
                - img [ref=e111]
                - text: "2"
            - paragraph [ref=e117]: Klassisches Schmorgericht mit Granatapfelmark
        - generic [ref=e120] [cursor=pointer]:
          - img "Kreolischer Hühnertopf" [ref=e122]
          - generic [ref=e124]:
            - heading "Kreolischer Hühnertopf" [level=3] [ref=e125]
            - generic [ref=e126]:
              - generic [ref=e127]:
                - img [ref=e128]
                - text: "5"
              - generic [ref=e130]:
                - img [ref=e131]
                - text: 60m
              - generic [ref=e134]:
                - img [ref=e135]
                - text: "6"
            - paragraph [ref=e141]: Würziger karibischer Eintopf mit Hähnchen, Gemüse und Kokosmilch, serviert mit Wildreis
        - generic [ref=e144] [cursor=pointer]:
          - img "Christophers Schokoinferno" [ref=e146]
          - generic [ref=e148]:
            - heading "Christophers Schokoinferno" [level=3] [ref=e149]
            - generic [ref=e150]:
              - generic [ref=e151]:
                - img [ref=e152]
                - text: "5"
              - generic [ref=e154]:
                - img [ref=e155]
                - text: 40m
              - generic [ref=e158]:
                - img [ref=e159]
                - text: "8"
            - paragraph [ref=e165]: Ein intensiver Schokoladenkuchen mit zartschmelzender Textur
        - generic [ref=e168] [cursor=pointer]:
          - img [ref=e171]
          - generic [ref=e176]:
            - heading "Bauernbrot Roggen/Weizen/Dinkel" [level=3] [ref=e177]
            - generic [ref=e179]:
              - img [ref=e180]
              - text: 210m
            - paragraph [ref=e184]: Traditionelles Bauernbrot mit Sauerteig aus Roggen-, Weizen- und Dinkelmehl, langer Reifezeit und knuspriger Kruste
        - generic [ref=e187] [cursor=pointer]:
          - img "Puddim di Laranga" [ref=e189]
          - generic [ref=e191]:
            - heading "Puddim di Laranga" [level=3] [ref=e192]
            - generic [ref=e193]:
              - generic [ref=e194]:
                - img [ref=e195]
                - text: 40m
              - generic [ref=e198]:
                - img [ref=e199]
                - text: "4"
            - paragraph [ref=e205]: Ein cremiger, karamellisierter Orangenpudding mit frischen Orangen und Pistazien
        - generic [ref=e208] [cursor=pointer]:
          - img "Hühnchen Satay Spieße mit Chili-Zucchini" [ref=e210]
          - generic [ref=e212]:
            - heading "Hühnchen Satay Spieße mit Chili-Zucchini" [level=3] [ref=e213]
            - generic [ref=e214]:
              - generic [ref=e215]:
                - img [ref=e216]
                - text: 25m
              - generic [ref=e219]:
                - img [ref=e220]
                - text: "3"
            - paragraph [ref=e226]: Saftige Hühnchen-Satay-Spieße mit einer würzigen Marinade, serviert mit scharfen Zucchini und duftendem Reis.
        - generic [ref=e229] [cursor=pointer]:
          - img "Hühnerfrikassee" [ref=e231]
          - generic [ref=e233]:
            - heading "Hühnerfrikassee" [level=3] [ref=e234]
            - generic [ref=e235]:
              - generic [ref=e236]:
                - img [ref=e237]
                - text: "4"
              - generic [ref=e239]:
                - img [ref=e240]
                - text: 60m
              - generic [ref=e243]:
                - img [ref=e244]
                - text: "4"
            - paragraph [ref=e250]: Klassisches Hühnerfrikassee mit Spargel und Champignons in einer cremigen Sauce
    - contentinfo [ref=e251]:
      - generic [ref=e253]:
        - link "Impressum" [ref=e254] [cursor=pointer]:
          - /url: /impressum
        - link "Datenschutz" [ref=e256] [cursor=pointer]:
          - /url: /datenschutz
  - generic [ref=e260]:
    - img [ref=e261]
    - generic [ref=e263]:
      - generic [ref=e264]:
        - heading "Cookie-Einstellungen" [level=3] [ref=e265]
        - paragraph [ref=e266]: Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung zu bieten. Notwendige Cookies ermöglichen grundlegende Funktionen, funktionale Cookies speichern deine Präferenzen.
      - generic [ref=e267]:
        - button "Alle akzeptieren" [ref=e268] [cursor=pointer]
        - button "Nur notwendige" [ref=e269] [cursor=pointer]
        - link "Einstellungen" [ref=e270] [cursor=pointer]:
          - /url: /settings
          - img
          - text: Einstellungen
      - paragraph [ref=e271]:
        - text: Mehr Informationen in unserer
        - link "Datenschutzerklärung" [ref=e272] [cursor=pointer]:
          - /url: /datenschutz
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Instagram URL Blocking', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Mock authentication (would need real user in production)
  6  |     await page.goto('/');
  7  |   });
  8  | 
  9  |   test('should warn about Instagram URLs in upload zone', async ({ page }) => {
  10 |     await page.goto('/');
  11 | 
  12 |     // Try to paste Instagram URL
> 13 |     await page.click('[data-testid="upload-zone"]');
     |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  14 |     await page.keyboard.type('https://www.instagram.com/p/ABC123/');
  15 | 
  16 |     // Should show warning
  17 |     await expect(page.locator('text=Instagram URLs werden nicht unterstützt')).toBeVisible();
  18 |   });
  19 | 
  20 |   test('should not block non-Instagram URLs', async ({ page }) => {
  21 |     await page.goto('/');
  22 | 
  23 |     // Try to paste normal URL
  24 |     await page.click('[data-testid="upload-zone"]');
  25 |     await page.keyboard.type('https://example.com/recipe');
  26 | 
  27 |     // Should NOT show warning
  28 |     await expect(page.locator('text=Instagram URLs werden nicht unterstützt')).not.toBeVisible();
  29 |   });
  30 | });
  31 | 
```