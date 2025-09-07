import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pdf from "npm:pdf-parse";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);


serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { path, userId } = await req.json();
    console.log("Processing PDF:", path);

    // Get user preferences for language and measurement units
    let userPrefs = { language: 'de', measurement_unit: 'metric' };
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('language, measurement_unit')
        .eq('id', userId)
        .single();
      
      if (profile) {
        userPrefs = profile;
      }
    }

    // 1) PDF aus Supabase Storage holen
    const { data, error } = await supabase.storage
      .from("pdf-uploads")
      .download(path);

    if (error) {
      console.error("Storage download error:", error);
      throw error;
    }

    const buffer = await data.arrayBuffer();
    console.log("PDF downloaded, size:", buffer.byteLength);

    // 2) Text extrahieren
    const parsed = await pdf(new Uint8Array(buffer));
    const text = parsed.text.substring(0, 4000); // Text begrenzen
    console.log("Extracted text length:", text.length);

    // 3) DeepSeek Chat API anfragen für Rezept-Extraktion
    const completion = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("DEEPSEEK_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { 
            role: "system", 
            content: "Du bist ein Rezept-Extraktions-Experte. Analysiere den Text und extrahiere Rezeptdaten. Antworte nur mit gültigem JSON ohne zusätzlichen Text." 
          },
          { 
            role: "user", 
            content: `Analysiere diesen PDF-Text und extrahiere Rezeptdaten. Antworte NUR mit einem gültigen JSON-Objekt:

{
  "title": "Rezeptname",
  "description": "Kurze Beschreibung",
  "ingredients": ["Zutat 1", "Zutat 2", ...],
  "structured_ingredients": [
    {
      "amount": Zahl_oder_null,
      "unit": "Einheit_als_Text_oder_null",
      "ingredient": "Zutatname"
    }
  ],
  "instructions": ["Schritt 1", "Schritt 2", ...],
  "cooking_time": Minuten_als_Zahl_oder_null,
  "servings": Portionen_als_Zahl_oder_null,
  "tags": ["tag1", "tag2", "tag3", ...]
}

WICHTIGE ANFORDERUNGEN:
- ${userPrefs.language === 'de' ? 'Übersetze alle Texte ins Deutsche.' : 
   userPrefs.language === 'en' ? 'Translate all text to English.' :
   userPrefs.language === 'fr' ? 'Traduisez tout le texte en français.' :
   userPrefs.language === 'es' ? 'Traduce todo el texto al español.' :
   userPrefs.language === 'it' ? 'Traduci tutto il testo in italiano.' :
   'Keep text in original language.'}
- ${userPrefs.measurement_unit === 'metric' ? 'Convert all measurements to metric units (grams, kilograms, milliliters, liters, Celsius).' : 'Convert all measurements to imperial units (ounces, pounds, fluid ounces, cups, Fahrenheit).'}
- Für structured_ingredients: Analysiere jede Zutat und extrahiere Menge (als Zahl), Einheit (als Text) und Zutatename
- Wenn eine Zutat keine messbare Menge hat, setze amount und unit auf null
- Beispiele: "200g Mehl" → {"amount": 200, "unit": "g", "ingredient": "Mehl"}, "1 Prise Salz" → {"amount": 1, "unit": "Prise", "ingredient": "Salz"}, "Salz nach Geschmack" → {"amount": null, "unit": null, "ingredient": "Salz nach Geschmack"}
- Stelle sicher, dass alle Zutatenmengen das spezifizierte Maßsystem verwenden
- Halte Kochanweisungen klar und detailliert
- Erstelle mindestens 3-5 passende Tags für das Rezept basierend auf:
  * Gericht-Kategorie (z.B. "hauptgericht", "dessert", "vorspeise", "snack", "cocktail", "beilage")
  * Küche/Herkunft (z.B. "italienisch", "asiatisch", "mediterran", "deutsch", "französisch")
  * Hauptzutat (z.B. "hähnchen", "pasta", "vegetarisch", "vegan", "fisch", "rindfleisch")
  * Zubereitungsart (z.B. "gebacken", "gebraten", "gekocht", "roh", "gegrillt")
  * Besonderheiten (z.B. "schnell", "gesund", "comfort-food", "festlich", "kalorienarm")
- Tags sollen in Kleinbuchstaben und ohne Leerzeichen sein (z.B. "tex-mex" statt "Tex Mex")

Text:
${text}` 
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    const result = await completion.json();
    console.log("DeepSeek response:", result);

    if (!result.choices?.[0]?.message?.content) {
      throw new Error("Keine gültige Antwort von DeepSeek");
    }

    const answer = result.choices[0].message.content.trim();
    console.log("DeepSeek answer raw:", answer);
    
    // JSON parsen und validieren
    let recipeData;
    try {
      // Entferne eventuelle Markdown-Formatierung
      const cleanAnswer = answer.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      recipeData = JSON.parse(cleanAnswer);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw answer was:", answer);
      
      // Fallback: Erstelle ein einfaches Rezept aus dem Text
      recipeData = {
        title: "PDF Rezept",
        description: "Aus PDF extrahiert",
        ingredients: text.split('\n').filter(line => line.includes('-') || line.includes('•')).slice(0, 10),
        instructions: ["Bitte bearbeiten Sie das Rezept manuell"],
        cooking_time: null,
        servings: null,
        tags: ["pdf", "manuell-bearbeiten", "unverarbeitet"]
      };
    }

    return new Response(JSON.stringify({ 
      success: true,
      data: recipeData 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("PDF processor error:", err);
    return new Response(JSON.stringify({ 
      success: false,
      error: err.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});