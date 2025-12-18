import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StructuredIngredient {
  amount: number | null;
  unit: string | null;
  ingredient: string;
}

interface RecipeData {
  title: string;
  description?: string;
  ingredients: string[];
  structured_ingredients?: StructuredIngredient[];
  instructions: string[];
  cooking_time?: number;
  servings?: number;
  tags?: string[];
  image_url?: string;
}

// Input validation constants
const MAX_CONTENT_LENGTH = 100000; // 100KB max text content
const MAX_URL_LENGTH = 2048;
const ALLOWED_URL_PROTOCOLS = ['http:', 'https:'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authentication: Validate user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let content: string = '';
    let contentType = req.headers.get('content-type') || '';
    let userPrefs = { language: 'de', measurement_unit: 'metric' };
    
    // Handle both JSON and FormData (for PDF files)
    if (contentType.includes('multipart/form-data')) {
      // Handle PDF file upload
      const formData = await req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return new Response(
          JSON.stringify({ error: 'PDF-Datei ist erforderlich' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (file.type !== 'application/pdf') {
        return new Response(
          JSON.stringify({ error: 'Nur PDF-Dateien werden unterstützt' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Convert PDF to base64 for DeepSeek API
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode(...uint8Array));
      content = `PDF_FILE:${base64}`;
      
      console.log('Processing PDF file:', file.name, 'Size:', file.size);
      
      // Get user preferences for language and measurement units using authenticated user.id
      const { data: profile } = await supabase.from('profiles')
        .select('language, measurement_unit')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        userPrefs = profile;
      }
    } else {
      // Handle JSON content (text or URL)
      const body = await req.json();
      
      // Get user preferences for language and measurement units using authenticated user.id
      const { data: profile } = await supabase.from('profiles')
        .select('language, measurement_unit')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        userPrefs = profile;
      }
      
      if (body.url) {
        // Handle URL scraping with validation
        const url = body.url;
        
        // Validate URL length
        if (typeof url !== 'string' || url.length > MAX_URL_LENGTH) {
          return new Response(
            JSON.stringify({ error: 'URL zu lang oder ungültig' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('Processing URL:', url);
        
        try {
          // Validate URL format and protocol
          const parsedUrl = new URL(url);
          if (!ALLOWED_URL_PROTOCOLS.includes(parsedUrl.protocol)) {
            throw new Error('Nur HTTP und HTTPS URLs sind erlaubt');
          }
          
          // Fetch content from URL with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const html = await response.text();
          
          // Extract text content from HTML (simple approach)
          // Remove script and style tags
          const cleanHtml = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          content = cleanHtml;
          console.log('Extracted content from URL, length:', content.length);
          
        } catch (error) {
          console.error('Error fetching URL:', error);
          return new Response(
            JSON.stringify({ 
              success: false,
              error: `Fehler beim Laden der URL: ${error instanceof Error ? error.message : String(error)}` 
            }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
      } else if (body.content) {
        // Handle direct text content with validation
        if (typeof body.content !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Inhalt muss ein Text sein' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (body.content.length > MAX_CONTENT_LENGTH) {
          return new Response(
            JSON.stringify({ error: `Inhalt zu groß (max ${MAX_CONTENT_LENGTH / 1000}KB)` }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        content = body.content;
        console.log('Processing text content, length:', content.length);
      } else {
        return new Response(
          JSON.stringify({ error: 'Rezepttext oder URL ist erforderlich' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Validate final content
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'Kein Inhalt extrahiert oder bereitgestellt' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Content received, analyzing with DeepSeek...');

    // Extract recipe data with xAI Grok
    const xaiApiKey = Deno.env.get('XAI_API_KEY');
    if (!xaiApiKey) {
      throw new Error('XAI_API_KEY nicht konfiguriert');
    }

    let messages;
    
    // This function now only handles text content
    if (content.startsWith('PDF_FILE:')) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'PDF files should be processed with pdf-processor function' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Handle text content
      const processContent = content.trim();
      
      const languageInstructions = userPrefs.language === 'de' ? 
        'Übersetze alle Texte ins Deutsche.' : 
        userPrefs.language === 'en' ? 'Translate all text to English.' :
        userPrefs.language === 'fr' ? 'Traduisez tout le texte en français.' :
        userPrefs.language === 'es' ? 'Traduce todo el texto al español.' :
        userPrefs.language === 'it' ? 'Traduci tutto il testo in italiano.' :
        'Keep text in original language.';

      const measurementInstructions = userPrefs.measurement_unit === 'metric' ? 
        'Convert all measurements to metric units (grams, kilograms, milliliters, liters, Celsius).' :
        'Convert all measurements to imperial units (ounces, pounds, fluid ounces, cups, Fahrenheit).';
      
      const prompt = `
Analysiere den folgenden Rezept-Inhalt und extrahiere Rezeptdaten. 
Antworte NUR mit einem gültigen JSON-Objekt ohne zusätzlichen Text:

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
- ${languageInstructions}
- ${measurementInstructions}
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

Rezept-Inhalt:
${processContent}
`;

      messages = [
        {
          role: 'system',
          content: 'Du bist ein Rezept-Extraktions-Experte. Extrahiere Rezeptdaten aus Text-Inhalten und antworte nur mit gültigem JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];
    }

    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${xaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-fast',
        messages: messages,
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!grokResponse.ok) {
      const errorText = await grokResponse.text();
      console.error('xAI Grok error:', errorText);
      throw new Error(`xAI Grok API Fehler: ${grokResponse.status}`);
    }

    const grokData = await grokResponse.json();
    const extractedText = grokData.choices[0]?.message?.content;
    
    if (!extractedText) {
      throw new Error('Keine Antwort von xAI Grok API');
    }

    console.log('Raw xAI Grok response:', extractedText);

    // Parse JSON response
    let recipeData: RecipeData;
    try {
      // Remove markdown code blocks if present
      const cleanedText = extractedText.replace(/```json\n?|\n?```/g, '').trim();
      recipeData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw response:', extractedText);
      throw new Error('Fehler beim Parsen der Rezeptdaten');
    }

    // Validate extracted data
    if (!recipeData.title || !Array.isArray(recipeData.ingredients) || !Array.isArray(recipeData.instructions)) {
      throw new Error('Unvollständige Rezeptdaten extrahiert');
    }

    console.log('Successfully extracted recipe data:', recipeData);

    // Image generation removed - users can manually generate images after recipe creation

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...recipeData,
          image_url: null
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in process-instagram-recipe function:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Verarbeiten des Rezepts',
        details: error instanceof Error ? error.name : 'Unknown error type'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});