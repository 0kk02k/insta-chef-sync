import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

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
  image_url?: string;
  tags?: string[];
}

interface ValidationResult {
  isValidRecipe: boolean;
  isCohesive: boolean;
  confidence: number;
  reason?: string;
  combinedRecipe?: RecipeData;
}

serve(async (req) => {
  console.log('🚀 process-screenshot-recipe function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey) {
      console.error('❌ OpenAI API key not found');
      throw new Error('OpenAI API key not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase configuration not found');
      throw new Error('Supabase configuration not found');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Smoke test endpoint
    const url = new URL(req.url);
    if (url.searchParams.get('selftest') === '1') {
      console.log('🧪 Running smoke test');
      const payload = {
        model: 'gpt-5-nano-2025-08-07',
        max_output_tokens: 50,
        input: [{ role: 'user', content: [{ type: 'input_text', text: 'Sage nur: {"ok":true}' }] }],
      };
      const resp = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAIApiKey}`,
        },
        body: JSON.stringify(payload),
      });
      const raw = await resp.text();
      return new Response(raw, { status: 200, headers: { ...corsHeaders, 'content-type': 'application/json' } });
    }

    const { imageBase64, imageMime, images, fileName, userId } = await req.json();

    // Normalize images input to array of { base64, mime }
    const normalizedImages: Array<{ base64: string; mime: string }> = (() => {
      if (Array.isArray(images)) {
        return images.map((img: any) =>
          typeof img === 'string'
            ? { base64: img, mime: 'image/jpeg' }
            : { base64: img.base64, mime: img.mime || 'image/jpeg' }
        );
      }
      if (imageBase64) {
        return [{ base64: imageBase64, mime: imageMime || 'image/jpeg' }];
      }
      return [];
    })();
    
    if (normalizedImages.length === 0 || !normalizedImages[0].base64) {
      throw new Error('No image data provided');
    }

    // Get user preferences for language and measurement units BEFORE multi-image validation
    let userPrefs = { language: 'de', measurement_unit: 'metric' } as { language: string; measurement_unit: string };
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('language, measurement_unit')
        .eq('id', userId)
        .single();
      if (profile) userPrefs = profile as any;
    }

    // If multiple images, validate they belong to the same recipe
    if (normalizedImages.length > 1) {
      console.log(`🔍 Processing ${normalizedImages.length} screenshots - validating coherence`);
      
      const validationResult = await validateMultipleScreenshots(normalizedImages, openAIApiKey, userPrefs);
      
      if (!validationResult.isValidRecipe) {
        throw new Error(`Ungültige Rezept-Screenshots: ${validationResult.reason}`);
      }
      
      if (!validationResult.isCohesive) {
        throw new Error(`Die Screenshots gehören nicht zu einem zusammenhängenden Rezept: ${validationResult.reason}`);
      }
      
      if (validationResult.combinedRecipe) {
        console.log('✅ Multiple screenshots successfully combined into single recipe');
        
        // Generate AI image for the combined recipe
        let generatedImageUrl = null;
        try {
          generatedImageUrl = await generateRecipeImage(validationResult.combinedRecipe, openAIApiKey, supabase);
        } catch (imageError) {
          console.warn('⚠️ Image generation failed, continuing without image:', imageError);
        }
        
        if (generatedImageUrl) {
          validationResult.combinedRecipe.image_url = generatedImageUrl;
        }
        
        return new Response(JSON.stringify({
          success: true,
          data: validationResult.combinedRecipe,
          validation: {
            coherent: true,
            confidence: validationResult.confidence,
            imageCount: normalizedImages.length
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        console.log('ℹ️ Validation returned no combinedRecipe, extracting from all images...');
        const extracted = await extractRecipeFromImages(normalizedImages, openAIApiKey, userPrefs);

        let generatedImageUrl = null;
        try {
          generatedImageUrl = await generateRecipeImage(extracted, openAIApiKey, supabase);
        } catch (imageError) {
          console.warn('⚠️ Image generation failed, continuing without image:', imageError);
        }
        if (generatedImageUrl) extracted.image_url = generatedImageUrl;

        return new Response(JSON.stringify({
          success: true,
          data: extracted,
          validation: {
            coherent: true,
            confidence: validationResult.confidence,
            imageCount: normalizedImages.length
          }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Process single image (original logic)
    const imageInfo = normalizedImages[0];

    // Build Data URL and analyze
    const dataUrl = `data:${imageInfo.mime};base64,${imageInfo.base64}`;
    const mimeType = imageInfo.mime;
    const base64Data = imageInfo.base64;
    const dataUrlHeader = dataUrl.substring(0, 80);
    
    console.log('🔍 Data-URL Header (first 80 chars):', dataUrlHeader);
    console.log('📋 MIME Type detected:', mimeType);
    console.log('📏 Base64 Data Length:', base64Data.length, 'characters');

    // userPrefs bereits oben geladen

    const languagePrompt = userPrefs.language === 'de' ? 'Übersetze alle Texte ins Deutsche.' : 
       userPrefs.language === 'en' ? 'Translate all text to English.' :
       userPrefs.language === 'fr' ? 'Traduisez tout le texte en français.' :
       userPrefs.language === 'es' ? 'Traduce todo el texto al español.' :
       userPrefs.language === 'it' ? 'Traduci tutto il testo in italiano.' :
       'Keep text in original language.';

    const unitPrompt = userPrefs.measurement_unit === 'metric' ? 'Convert measurements to metric (grams, kg, ml, liters, Celsius). IMPORTANT: Convert "cups" to actual volume/weight - e.g. "1 cup flour" = "125g Mehl", "1 cup milk" = "240ml Milch", not just "1 Tasse". Convert "tsb/tbsp" to "EL" (Esslöffel) and "tsp" to "TL" (Teelöffel).' : 'Convert measurements to imperial (oz, lbs, cups, Fahrenheit).';

    console.log('📸 Processing screenshot with GPT-4o-mini Vision API (Chat Completions)');
    console.log('🎯 API Endpoint: /v1/chat/completions');

    // Fallback to Chat Completions API (more stable for GPT-5-Nano)
    const payload = {
      model: 'gpt-4o-mini', // Bewährtes Vision-Modell statt GPT-5 Nano
      max_tokens: 2000, // Für gpt-4o-mini verwenden wir max_tokens
      // Explicitly disable streaming
      stream: false,
      messages: [
        {
          role: 'system',
          content: `Du bist ein zuverlässiger Parser. Antworte ausschließlich mit valider JSON. ${languagePrompt} ${unitPrompt}`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extrahiere das Rezept als JSON: { "title": string, "servings": number|null, "ingredients": [string], "structured_ingredients": [{"amount": number|null, "unit": string|null, "ingredient": string}], "instructions": [string], "cooking_time": number|null, "description": string|null, "tags": [string] }. 

${languagePrompt} 
${unitPrompt}

WICHTIGE UMRECHNUNGSREGELN für "cups":
- 1 cup Mehl = 125g
- 1 cup Zucker = 200g  
- 1 cup Butter = 225g
- 1 cup Milch/Wasser = 240ml
- 1 cup gehackte Nüsse = 100g
- 1 cup Reis (ungekocht) = 185g

WICHTIGE UMRECHNUNGSREGELN für Löffel:
- tsb/tbsp = EL (Esslöffel)
- tsp = TL (Teelöffel)

Schreibe niemals "Tasse" sondern immer die korrekte metrische Angabe.

STRUCTURED_INGREDIENTS: Analysiere jede Zutat und extrahiere Menge (als Zahl), Einheit (als Text) und Zutatename.
- Wenn eine Zutat keine messbare Menge hat, setze amount und unit auf null
- Beispiele: "200g Mehl" → {"amount": 200, "unit": "g", "ingredient": "Mehl"}, "1 Prise Salz" → {"amount": 1, "unit": "Prise", "ingredient": "Salz"}, "Salz nach Geschmack" → {"amount": null, "unit": null, "ingredient": "Salz nach Geschmack"}

BESCHREIBUNG: Wenn keine Beschreibung im Bild vorhanden ist, erstelle eine appetitliche, kurze Beschreibung (1-2 Sätze) basierend auf den Zutaten und der Art des Gerichts. Beispiele:
- "Ein saftiger Schokoladenkuchen mit intensivem Kakaogeschmack"
- "Cremige Pasta mit würziger Tomatensauce und frischen Kräutern"
- "Knuspriges Hähnchen mit mediterranen Gewürzen und Gemüse"

KOCHZEIT: Analysiere alle Zubereitungsschritte und summiere alle Zeitangaben (Backen, Kochen, Braten, Ruhen, etc.) zu einer Gesamtzeit in Minuten. Beispiele:
- "10 Min braten + 30 Min backen + 15 Min ruhen" = 55 Minuten
- "5 Min vorbereiten + 20 Min köcheln" = 25 Minuten
Falls keine Zeiten erkennbar sind, schätze basierend auf der Art des Gerichts.

TAGS: Erstelle mindestens 3-5 passende Tags für das Rezept basierend auf:
- Gericht-Kategorie (z.B. "hauptgericht", "dessert", "vorspeise", "snack", "cocktail", "beilage")
- Küche/Herkunft (z.B. "italienisch", "asiatisch", "mediterran", "deutsch", "französisch")
- Hauptzutat (z.B. "hähnchen", "pasta", "vegetarisch", "vegan", "fisch", "rindfleisch")
- Zubereitungsart (z.B. "gebacken", "gebraten", "gekocht", "roh", "gegrillt")
- Besonderheiten (z.B. "schnell", "gesund", "comfort-food", "festlich", "kalorienarm")
Tags sollen in Kleinbuchstaben und ohne Leerzeichen sein (z.B. "tex-mex" statt "Tex Mex").

Wenn unlesbar: {"status":"unreadable","reason": "..."}`
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ]
    };

    // Log complete payload without API key for debugging
    const payloadForLogging = { ...payload };
    console.log('📋 Complete Payload (without API key):');
    console.log(JSON.stringify(payloadForLogging, null, 2));

    console.log('📤 Sending payload to OpenAI Chat Completions API (GPT-4o-mini)');
    console.log('🔧 Payload model:', payload.model);
    console.log('🔧 Max tokens:', payload.max_tokens);
    console.log('🔧 Stream disabled:', payload.stream === false);

    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('❌ OpenAI Vision API error:', errorText);
      throw new Error(`OpenAI Vision API error: ${visionResponse.status}`);
    }

    console.log('✅ GPT-5 Nano Vision response received');
    
    const rawResponse = await visionResponse.text();
    console.log('🔍 COMPLETE OpenAI Response (raw text):', rawResponse);
    
    let visionData: any = null;
    try {
      visionData = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error('❌ JSON parse of response failed:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI response parsing failed', 
          details: parseError.message,
          rawResponse 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log moderation info, usage, finish_reason, warnings
    console.log('📊 Response metadata:');
    console.log('  - finish_reason:', visionData?.finish_reason);
    console.log('  - usage:', JSON.stringify(visionData?.usage || 'none'));
    console.log('  - warnings:', JSON.stringify(visionData?.warnings || 'none'));
    console.log('  - moderation:', JSON.stringify(visionData?.moderation || 'none'));

    // Extract text from Chat Completions API
    function extractChatContent(res: any): string | null {
      const t = res?.choices?.[0]?.message?.content ??
                res?.choices?.[0]?.delta?.content ??
                null;
      return typeof t === 'string' && t.trim() ? t : null;
    }

    let content = extractChatContent(visionData);
    console.log('📝 extracted content from Chat Completions:', content);

    // Fallback: Try Responses API fields if Chat Completions fails
    if (!content) {
      content = typeof visionData?.output_text === 'string' && visionData.output_text.trim()
        ? visionData.output_text
        : visionData?.output?.[0]?.content?.[0]?.text ?? null;
      console.log('🧪 fallback extracted text from Responses fields:', content);
    }

    if (!content || !content.trim()) {
      console.log('❌ Empty content - exploring response structure:');
      console.log('  - response keys:', Object.keys(visionData || {}));
      console.log('  - output structure:', JSON.stringify(visionData?.output || 'none'));
      console.log('  - full response structure:', JSON.stringify(visionData, null, 2));
      
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI returned empty content', 
          details: 'Responses API returned empty content',
          responseKeys: Object.keys(visionData || {}),
          rawResponse 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Safe JSON parsing with fallbacks
    function safeParseJson(s: string) {
      try {
        return JSON.parse(s);
      } catch {
        const m = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (m) {
          try { return JSON.parse(m[1]); } catch {}
        }
        const start = s.indexOf('{');
        const end = s.lastIndexOf('}');
        if (start >= 0 && end > start) {
          try { return JSON.parse(s.slice(start, end + 1)); } catch {}
        }
        return null;
      }
    }

    const recipeData = safeParseJson(content);
    if (!recipeData) {
      return new Response(
        JSON.stringify({ 
          error: 'Could not parse model output as JSON', 
          details: 'JSON parsing failed after all fallback attempts',
          content 
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for unreadable status
    if (recipeData.status === 'unreadable') {
      throw new Error(`Das Rezept im Screenshot konnte nicht erkannt werden: ${recipeData.reason || 'Unbekannter Grund'}`);
    }

    // Validate required fields
    if (!recipeData.title) {
      throw new Error('Kein Rezepttitel im Screenshot erkennbar');
    }
    
    if (!recipeData.ingredients || !Array.isArray(recipeData.ingredients) || recipeData.ingredients.length === 0) {
      throw new Error('Keine Zutaten im Screenshot erkennbar');
    }
    
    if (!recipeData.instructions || !Array.isArray(recipeData.instructions) || recipeData.instructions.length === 0) {
      throw new Error('Keine Zubereitungsschritte im Screenshot erkennbar');
    }
    
    console.log('✅ Successfully parsed recipe data:', recipeData.title);

    console.log('✅ Recipe data extracted:', recipeData.title);

    // Step 2: Generate an AI image based on the recipe
    let generatedImageUrl = null;
    try {
      generatedImageUrl = await generateRecipeImage(recipeData, openAIApiKey, supabase);
    } catch (imageError) {
      console.warn('⚠️ Image generation failed, continuing without image:', imageError);
    }

    if (generatedImageUrl) {
      recipeData.image_url = generatedImageUrl;
    }

    console.log('✅ Screenshot processing completed successfully');

    return new Response(JSON.stringify({
      success: true,
      data: recipeData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in process-screenshot-recipe function:', error);
    
    // Always return 200 with success:false so the client can show a friendly error instead of a non-200
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to validate multiple screenshots
async function validateMultipleScreenshots(
  images: Array<{ base64: string; mime: string }>, 
  openAIApiKey: string, 
  userPrefs: { language: string; measurement_unit: string }
): Promise<ValidationResult> {
  const languageInstructions = userPrefs.language === 'de' ? 
    'Übersetze alle Texte ins Deutsche. WICHTIG: Alle Rezeptinhalte (Titel, Zutaten, Anweisungen, Beschreibung, Tags) müssen auf Deutsch sein.' : 
    userPrefs.language === 'en' ? 'Translate all text to English. IMPORTANT: All recipe content (title, ingredients, instructions, description, tags) must be in English.' :
    userPrefs.language === 'fr' ? 'Traduisez tout le texte en français. IMPORTANT: Tout le contenu de la recette doit être en français.' :
    userPrefs.language === 'es' ? 'Traduce todo el texto al español. IMPORTANTE: Todo el contenido de la receta debe estar en español.' :
    userPrefs.language === 'it' ? 'Traduci tutto il testo in italiano. IMPORTANTE: Tutto il contenuto della ricetta deve essere in italiano.' :
    'Keep text in original language.';

  const measurementInstructions = userPrefs.measurement_unit === 'metric' ? 
    'Konvertiere alle Mengenangaben in metrische Einheiten (Gramm, Kilogramm, Milliliter, Liter, Celsius). WICHTIG: Konvertiere "cups" in tatsächliche Volumen/Gewicht - z.B. "1 cup flour" = "125g Mehl", "1 cup milk" = "240ml Milch", nicht nur "1 Tasse". Konvertiere "tbsp" zu "EL" (Esslöffel) und "tsp" zu "TL" (Teelöffel).' :
    'Konvertiere alle Mengenangaben in imperiale Einheiten (Unzen, Pfund, Cups, Fahrenheit).';
  
  // Create image content array for all images
  const imageContent = images.map(img => ({
    type: 'image_url',
    image_url: { url: `data:${img.mime};base64,${img.base64}` }
  }));

  const payload = {
    model: 'gpt-4o-mini',
    max_tokens: 3000,
    stream: false,
    messages: [
      {
        role: 'system',
        content: `Du bist ein Experte für Rezept-Analyse. Analysiere mehrere Screenshots und bestimme:
1. Gehören alle Screenshots zu EIN zusammenhängendes Rezept?
2. Enthalten sie gültige Rezept-Informationen?
3. Können sie zu einem vollständigen Rezept kombiniert werden?

${languageInstructions}
${measurementInstructions}

Antworte NUR mit gültigem JSON in diesem Format:
{
  "isValidRecipe": boolean,
  "isCohesive": boolean,
  "confidence": number (0-100),
  "reason": string,
  "combinedRecipe": {
    "title": string,
    "description": string,
    "ingredients": [string],
    "structured_ingredients": [{"amount": number|null, "unit": string|null, "ingredient": string}],
    "instructions": [string],
    "cooking_time": number|null,
    "servings": number|null,
    "tags": [string]
  } | null
}`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analysiere diese ${images.length} Screenshots. Gehören sie zu einem zusammenhängenden Rezept? Falls ja, kombiniere sie zu einem vollständigen Rezept.

WICHTIGE REGELN:
- Screenshots von VERSCHIEDENEN Rezepten → isCohesive: false
- Screenshots vom GLEICHEN Rezept (z.B. mehrseitig) → isCohesive: true, erstelle combinedRecipe
- Unvollständige oder unlesbare Screenshots → isValidRecipe: false
- Confidence: 90-100% = sehr sicher, 70-89% = wahrscheinlich, <70% = unsicher

${languageInstructions}
${measurementInstructions}

Beispiele für korrekte Umrechnungen:
- "1 cup flour" → "125g Mehl" (nicht "1 Tasse Mehl")
- "2 tbsp butter" → "30g Butter" (nicht "2 EL Butter")
- "1 tsp salt" → "5g Salz" (nicht "1 TL Salz")

Erstelle strukturierte Zutaten und mindestens 3-5 Tags (z.B. "hauptgericht", "italienisch", "pasta", "vegetarisch").`
          },
          ...imageContent
        ]
      }
    ]
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('❌ Validation API error body:', errText);
    throw new Error(`Validation API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No validation response received');
  }

  // Robust JSON parse (handles ```json fences and partial snippets)
  function safeParseJsonLocal(s: string) {
    try {
      return JSON.parse(s);
    } catch {
      const m = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (m) {
        try { return JSON.parse(m[1]); } catch {}
      }
      const start = s.indexOf('{');
      const end = s.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try { return JSON.parse(s.slice(start, end + 1)); } catch {}
      }
      return null;
    }
  }

  try {
    const result = safeParseJsonLocal(content);
    if (!result) {
      console.error('❌ Failed to parse validation JSON. Raw content:', content);
      return {
        isValidRecipe: false,
        isCohesive: false,
        confidence: 0,
        reason: 'Validation response parsing failed',
      };
    }

    console.log('🔍 Validation result:', {
      isValid: result.isValidRecipe,
      isCohesive: result.isCohesive,
      confidence: result.confidence,
      reason: result.reason
    });
    
    return result;
  } catch (parseError) {
    console.error('❌ Failed to parse validation response:', parseError);
    return {
      isValidRecipe: false,
      isCohesive: false,
      confidence: 0,
      reason: 'Validation response parsing failed'
    };
  }
}

// Extract combined recipe from multiple images
async function extractRecipeFromImages(
  images: Array<{ base64: string; mime: string }>,
  openAIApiKey: string,
  userPrefs: { language: string; measurement_unit: string }
): Promise<RecipeData> {
  const languageInstructions = userPrefs.language === 'de' ? 
    'Übersetze alle Texte ins Deutsche. WICHTIG: Alle Rezeptinhalte (Titel, Zutaten, Anweisungen, Beschreibung, Tags) müssen auf Deutsch sein.' : 
    userPrefs.language === 'en' ? 'Translate all text to English. IMPORTANT: All recipe content (title, ingredients, instructions, description, tags) must be in English.' :
    userPrefs.language === 'fr' ? 'Traduisez tout le texte en français. IMPORTANT: Tout le contenu de la recette doit être en français.' :
    userPrefs.language === 'es' ? 'Traduce todo el texto al español. IMPORTANTE: Todo el contenido de la receta debe estar en español.' :
    userPrefs.language === 'it' ? 'Traduci tutto il testo in italiano. IMPORTANTE: Tutto il contenuto della ricetta deve essere in italiano.' :
    'Keep text in original language.';

  const measurementInstructions = userPrefs.measurement_unit === 'metric' ? 
    'Konvertiere alle Mengenangaben in metrische Einheiten (Gramm, Kilogramm, Milliliter, Liter, Celsius). WICHTIG: Konvertiere "cups" in tatsächliche Volumen/Gewicht - z.B. "1 cup flour" = "125g Mehl", "1 cup milk" = "240ml Milch", nicht nur "1 Tasse". Konvertiere "tbsp" zu "EL" (Esslöffel) und "tsp" zu "TL" (Teelöffel). Aber verwende in structured_ingredients die Gramm-Werte: "125g" statt "EL".' :
    'Konvertiere alle Mengenangaben in imperiale Einheiten (Unzen, Pfund, Cups, Fahrenheit).';

  const imageContent = images.map(img => ({
    type: 'image_url',
    image_url: { url: `data:${img.mime};base64,${img.base64}` }
  }));

  const payload = {
    model: 'gpt-4o-mini',
    max_tokens: 2000,
    stream: false,
    messages: [
      { 
        role: 'system', 
        content: `Du bist ein zuverlässiger Rezept-Parser. Antworte ausschließlich mit valider JSON.

${languageInstructions}
${measurementInstructions}

Beispiele für korrekte Umrechnungen:
- "1 cup flour" → Zutat: "125g Mehl", structured: {"amount": 125, "unit": "g", "ingredient": "Mehl"}
- "2 tbsp butter" → Zutat: "30g Butter", structured: {"amount": 30, "unit": "g", "ingredient": "Butter"}
- "1 tsp salt" → Zutat: "5g Salz", structured: {"amount": 5, "unit": "g", "ingredient": "Salz"}` 
      },
      { 
        role: 'user', 
        content: [
          { 
            type: 'text', 
            text: `Extrahiere das Rezept aus diesen Bildern als JSON mit diesem exakten Format:

{
  "title": string,
  "servings": number|null,
  "ingredients": [string],
  "structured_ingredients": [{"amount": number|null, "unit": string|null, "ingredient": string}],
  "instructions": [string],
  "cooking_time": number|null,
  "description": string|null,
  "tags": [string]
}

${languageInstructions}
${measurementInstructions}

Erstelle mindestens 3-5 passende Tags für das Rezept.` 
          },
          ...imageContent
        ]
      }
    ]
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errText = await response.text();
    console.error('❌ Extract API error body:', errText);
    throw new Error(`Extract API error: ${response.status}`);
  }
  const raw = await response.text();
  let data: any;
  try { data = JSON.parse(raw); } catch { throw new Error('Extract API JSON parse failed'); }
  const content = data?.choices?.[0]?.message?.content as string | undefined;

  function safeParseJson(s: string | undefined) {
    if (!s) return null; 
    try { return JSON.parse(s); } catch {
      const m = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (m) { try { return JSON.parse(m[1]); } catch {} }
      const start = s.indexOf('{');
      const end = s.lastIndexOf('}');
      if (start >= 0 && end > start) { try { return JSON.parse(s.slice(start, end + 1)); } catch {} }
      return null;
    }
  }

  const recipe = safeParseJson(content);
  if (!recipe) throw new Error('Konnte kombiniertes Rezept nicht parsen');
  if (!recipe.title) throw new Error('Kein Rezepttitel gefunden');
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) throw new Error('Keine Zutaten gefunden');
  if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) throw new Error('Keine Zubereitungsschritte gefunden');

  return recipe as RecipeData;
}

// Helper function to generate recipe image
async function generateRecipeImage(
  recipeData: RecipeData, 
  openAIApiKey: string, 
  supabase: any
): Promise<string | null> {
  console.log('🎨 Generating AI image for recipe');
  
  const imagePrompt = `A beautiful, professional food photography image of ${recipeData.title}. 
  ${recipeData.description ? recipeData.description + '. ' : ''}
  High quality, appetizing, well-lit, restaurant-style presentation. Ultra high resolution.`;

  const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'high',
      output_format: 'png',
    }),
  });

  if (!imageResponse.ok) {
    console.error('❌ Image generation failed:', await imageResponse.text());
    return null;
  }

  const imageData = await imageResponse.json();
  const imageBase64Data = imageData.data[0].b64_json;
  
  if (!imageBase64Data) {
    return null;
  }

  // Upload the generated image to Supabase Storage
  const imageBuffer = Uint8Array.from(atob(imageBase64Data), c => c.charCodeAt(0));
  const imageFileName = `generated-${Date.now()}-${recipeData.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('recipe-images')
    .upload(imageFileName, imageBuffer, {
      contentType: 'image/png'
    });

  if (uploadError) {
    console.error('❌ Image upload error:', uploadError);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('recipe-images')
    .getPublicUrl(imageFileName);
  
  console.log('✅ AI image generated and uploaded');
  return publicUrl;
}