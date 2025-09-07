-- Update the Hühnerfrikassee recipe with structured ingredients
UPDATE recipes 
SET structured_ingredients = '[
  {"amount": 1, "unit": null, "ingredient": "weiße Zwiebel"},
  {"amount": 4, "unit": null, "ingredient": "Hähnchenkeulen (à 350 g)"},
  {"amount": 3, "unit": null, "ingredient": "Lorbeerblätter"},
  {"amount": 0.5, "unit": "Teelöffel", "ingredient": "schwarze Pfefferkörner"},
  {"amount": 5, "unit": null, "ingredient": "Wacholderbeeren"},
  {"amount": 3, "unit": null, "ingredient": "Gewürznelken"},
  {"amount": null, "unit": null, "ingredient": "Salz"},
  {"amount": 100, "unit": "ml", "ingredient": "Weißwein"},
  {"amount": 500, "unit": "g", "ingredient": "weißer Spargel"},
  {"amount": 250, "unit": "g", "ingredient": "grüner Spargel"},
  {"amount": null, "unit": null, "ingredient": "Zucker"},
  {"amount": 150, "unit": "g", "ingredient": "Champignons (klein)"},
  {"amount": 2, "unit": "Esslöffel", "ingredient": "Butter (30 g)"},
  {"amount": 2, "unit": "Esslöffel", "ingredient": "Mehl (30 g)"},
  {"amount": 50, "unit": "ml", "ingredient": "Schlagsahne"},
  {"amount": null, "unit": null, "ingredient": "Cayennepfeffer"},
  {"amount": 1, "unit": "Spritzer", "ingredient": "Zitronensaft"},
  {"amount": 4, "unit": "Stiele", "ingredient": "Estragon (oder 2 Teelöffel getrockneter Estragon)"}
]'::jsonb
WHERE id = '48258334-89cc-4048-bbe7-0ef5400fc140';