# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: recipe-creation.spec.ts >> Recipe Creation Flow >> should show text input option
- Location: e2e/recipe-creation.spec.ts:27:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Rezept")').first()

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
        - button [ref=e15] [cursor=pointer]:
          - img
    - generic [ref=e16]:
      - generic [ref=e18]:
        - generic [ref=e19]:
          - img [ref=e20]
          - textbox "Rezepte durchsuchen (Titel, Beschreibung, Zutaten, Tags)..." [ref=e23]
        - generic [ref=e25]:
          - img [ref=e26]
          - textbox "Nach Benutzer suchen..." [ref=e31]
      - generic [ref=e33]:
        - generic [ref=e36] [cursor=pointer]:
          - img "Gerösteter Wirsing mit Anchoïade und Chili-Bröseln" [ref=e38]
          - generic [ref=e40]:
            - heading "Gerösteter Wirsing mit Anchoïade und Chili-Bröseln" [level=3] [ref=e41]
            - generic [ref=e43]:
              - img [ref=e44]
              - text: "4"
            - paragraph [ref=e50]: Gerösteter Wirsing mit einer würzigen Anchoïade-Sauce und knusprigen Chili-Bröseln als vegetarische Beilage.
        - generic [ref=e53] [cursor=pointer]:
          - img "Dumpling-Lasagne" [ref=e55]
          - generic [ref=e57]:
            - heading "Dumpling-Lasagne" [level=3] [ref=e58]
            - generic [ref=e59]:
              - generic [ref=e60]:
                - img [ref=e61]
                - text: "5"
              - generic [ref=e63]:
                - img [ref=e64]
                - text: 25m
              - generic [ref=e67]:
                - img [ref=e68]
                - text: "1"
            - paragraph [ref=e74]: Eine schichtige Lasagne mit saftigem Schweinehackfleisch und Teigwaren, inspiriert von Suppendumplings. Einfach zuzubereiten, voller Umami-Geschmack und ohne Falten der Teigwaren.
        - generic [ref=e77] [cursor=pointer]:
          - img "Bœuf Bourguignon Rezept – original französisch & unkompliziert" [ref=e79]
          - generic [ref=e81]:
            - heading "Bœuf Bourguignon Rezept – original französisch & unkompliziert" [level=3] [ref=e82]
            - generic [ref=e83]:
              - generic [ref=e84]:
                - img [ref=e85]
                - text: 180m
              - generic [ref=e88]:
                - img [ref=e89]
                - text: "6"
            - paragraph [ref=e95]: Original französisches Bœuf Bourguignon – mit zartem Fleisch und kräftiger Rotweinsauce. Ein Klassiker, einfach gemacht!
        - generic [ref=e98] [cursor=pointer]:
          - img "Fesenjan Schmorgericht" [ref=e100]
          - generic [ref=e102]:
            - heading "Fesenjan Schmorgericht" [level=3] [ref=e103]
            - generic [ref=e104]:
              - generic [ref=e105]:
                - img [ref=e106]
                - text: 60m
              - generic [ref=e109]:
                - img [ref=e110]
                - text: "2"
            - paragraph [ref=e116]: Klassisches Schmorgericht mit Granatapfelmark
        - generic [ref=e119] [cursor=pointer]:
          - img "Kreolischer Hühnertopf" [ref=e121]
          - generic [ref=e123]:
            - heading "Kreolischer Hühnertopf" [level=3] [ref=e124]
            - generic [ref=e125]:
              - generic [ref=e126]:
                - img [ref=e127]
                - text: "5"
              - generic [ref=e129]:
                - img [ref=e130]
                - text: 60m
              - generic [ref=e133]:
                - img [ref=e134]
                - text: "6"
            - paragraph [ref=e140]: Würziger karibischer Eintopf mit Hähnchen, Gemüse und Kokosmilch, serviert mit Wildreis
        - generic [ref=e143] [cursor=pointer]:
          - img "Christophers Schokoinferno" [ref=e145]
          - generic [ref=e147]:
            - heading "Christophers Schokoinferno" [level=3] [ref=e148]
            - generic [ref=e149]:
              - generic [ref=e150]:
                - img [ref=e151]
                - text: "5"
              - generic [ref=e153]:
                - img [ref=e154]
                - text: 40m
              - generic [ref=e157]:
                - img [ref=e158]
                - text: "8"
            - paragraph [ref=e164]: Ein intensiver Schokoladenkuchen mit zartschmelzender Textur
        - generic [ref=e167] [cursor=pointer]:
          - img [ref=e170]
          - generic [ref=e175]:
            - heading "Bauernbrot Roggen/Weizen/Dinkel" [level=3] [ref=e176]
            - generic [ref=e178]:
              - img [ref=e179]
              - text: 210m
            - paragraph [ref=e183]: Traditionelles Bauernbrot mit Sauerteig aus Roggen-, Weizen- und Dinkelmehl, langer Reifezeit und knuspriger Kruste
        - generic [ref=e186] [cursor=pointer]:
          - img "Puddim di Laranga" [ref=e188]
          - generic [ref=e190]:
            - heading "Puddim di Laranga" [level=3] [ref=e191]
            - generic [ref=e192]:
              - generic [ref=e193]:
                - img [ref=e194]
                - text: 40m
              - generic [ref=e197]:
                - img [ref=e198]
                - text: "4"
            - paragraph [ref=e204]: Ein cremiger, karamellisierter Orangenpudding mit frischen Orangen und Pistazien
        - generic [ref=e207] [cursor=pointer]:
          - img "Hühnchen Satay Spieße mit Chili-Zucchini" [ref=e209]
          - generic [ref=e211]:
            - heading "Hühnchen Satay Spieße mit Chili-Zucchini" [level=3] [ref=e212]
            - generic [ref=e213]:
              - generic [ref=e214]:
                - img [ref=e215]
                - text: 25m
              - generic [ref=e218]:
                - img [ref=e219]
                - text: "3"
            - paragraph [ref=e225]: Saftige Hühnchen-Satay-Spieße mit einer würzigen Marinade, serviert mit scharfen Zucchini und duftendem Reis.
        - generic [ref=e228] [cursor=pointer]:
          - img "Hühnerfrikassee" [ref=e230]
          - generic [ref=e232]:
            - heading "Hühnerfrikassee" [level=3] [ref=e233]
            - generic [ref=e234]:
              - generic [ref=e235]:
                - img [ref=e236]
                - text: "4"
              - generic [ref=e238]:
                - img [ref=e239]
                - text: 60m
              - generic [ref=e242]:
                - img [ref=e243]
                - text: "4"
            - paragraph [ref=e249]: Klassisches Hühnerfrikassee mit Spargel und Champignons in einer cremigen Sauce
    - contentinfo [ref=e250]:
      - generic [ref=e252]:
        - link "Impressum" [ref=e253] [cursor=pointer]:
          - /url: /impressum
        - link "Datenschutz" [ref=e255] [cursor=pointer]:
          - /url: /datenschutz
  - generic [ref=e259]:
    - img [ref=e260]
    - generic [ref=e262]:
      - generic [ref=e263]:
        - heading "Cookie-Einstellungen" [level=3] [ref=e264]
        - paragraph [ref=e265]: Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung zu bieten. Notwendige Cookies ermöglichen grundlegende Funktionen, funktionale Cookies speichern deine Präferenzen.
      - generic [ref=e266]:
        - button "Alle akzeptieren" [ref=e267] [cursor=pointer]
        - button "Nur notwendige" [ref=e268] [cursor=pointer]
        - link "Einstellungen" [ref=e269] [cursor=pointer]:
          - /url: /settings
          - img
          - text: Einstellungen
      - paragraph [ref=e270]:
        - text: Mehr Informationen in unserer
        - link "Datenschutzerklärung" [ref=e271] [cursor=pointer]:
          - /url: /datenschutz
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Recipe Creation Flow', () => {
  4  |   test('should show recipe creation dialog', async ({ page }) => {
  5  |     await page.goto('/');
  6  | 
  7  |     // Click add recipe button
  8  |     const addButton = page.locator('button:has-text("Rezept")').first();
  9  |     await addButton.click();
  10 | 
  11 |     // Should show dialog
  12 |     await expect(page.locator('[role="dialog"]')).toBeVisible();
  13 |   });
  14 | 
  15 |   test('should upload image file', async ({ page }) => {
  16 |     await page.goto('/');
  17 | 
  18 |     // Click add recipe
  19 |     const addButton = page.locator('button:has-text("Rezept")').first();
  20 |     await addButton.click();
  21 | 
  22 |     // Upload file (would need actual file)
  23 |     const fileInput = page.locator('input[type="file"]');
  24 |     await expect(fileInput).toBeVisible();
  25 |   });
  26 | 
  27 |   test('should show text input option', async ({ page }) => {
  28 |     await page.goto('/');
  29 | 
  30 |     const addButton = page.locator('button:has-text("Rezept")').first();
> 31 |     await addButton.click();
     |                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  32 | 
  33 |     // Should have paste option
  34 |     await expect(page.locator('text=Text einfügen')).toBeVisible();
  35 |   });
  36 | });
  37 | 
```