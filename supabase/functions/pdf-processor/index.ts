import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore - unpdf is a serverless-compatible PDF library
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_PDF_SIZE = 25 * 1024 * 1024; // 25MB max PDF size
const MAX_PATH_LENGTH = 500;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Methode nicht erlaubt'
    }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authentication: Validate user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Nicht autorisiert'
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Nicht autorisiert'
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('Authenticated user:', user.id);

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { path } = await req.json();
    
    // Validate path input
    if (!path || typeof path !== 'string' || path.length > MAX_PATH_LENGTH) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Ungültiger Dateipfad'
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Path must stay inside the authenticated user's storage folder.
    if (
      path.includes('..') ||
      path.startsWith('/') ||
      !path.startsWith(`${user.id}/`) ||
      !path.toLowerCase().endsWith('.pdf')
    ) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Ungültiger Dateipfad'
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log("Processing PDF for user:", user.id);

    // Get user preferences for language and measurement units (use authenticated user.id)
    let userPrefs = { language: 'de', measurement_unit: 'metric' };
    const { data: profile } = await supabase
      .from('profiles')
      .select('language, measurement_unit')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      userPrefs = profile;
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
    
    // Validate PDF size
    if (buffer.byteLength > MAX_PDF_SIZE) {
      return new Response(JSON.stringify({ 
        success: false,
        error: `PDF zu groß (max ${MAX_PDF_SIZE / 1024 / 1024}MB)`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Text extrahieren mit unpdf (serverless-kompatibel)
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text: fullText } = await extractText(pdf, { mergePages: true });
    const text = fullText.substring(0, 8000); // Text begrenzen (erhöht für bessere Extraktion)
    console.log("Extracted text length:", text.length);

    // 3) xAI Grok Chat API anfragen für Rezept-Extraktion
    const completion = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("XAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "grok-4-fast",
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
    if (!result.choices?.[0]?.message?.content) {
      throw new Error("Keine gültige Antwort von xAI Grok");
    }

    const answer = result.choices[0].message.content.trim();
    
    // JSON parsen und validieren
    let recipeData;
    try {
      // Entferne eventuelle Markdown-Formatierung
      const cleanAnswer = answer.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      recipeData = JSON.parse(cleanAnswer);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      
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
      error: "PDF konnte nicht verarbeitet werden"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
