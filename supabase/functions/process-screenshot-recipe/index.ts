import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecipeData {
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  cooking_time?: number;
  servings?: number;
  image_url?: string;
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

    const { imageBase64, fileName, userId } = await req.json();

    if (!imageBase64) {
      throw new Error('No image data provided');
    }

    // Extract MIME type and analyze data URL structure
    const dataUrlMatch = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = dataUrlMatch ? dataUrlMatch[1] : 'unknown';
    const base64Data = dataUrlMatch ? dataUrlMatch[2] : imageBase64;
    const dataUrlHeader = imageBase64.substring(0, 80);
    
    console.log('🔍 Data-URL Header (first 80 chars):', dataUrlHeader);
    console.log('📋 MIME Type detected:', mimeType);
    console.log('📏 Base64 Data Length:', base64Data.length, 'characters');

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
              text: `Extrahiere das Rezept als JSON: { "title": string, "servings": number|null, "ingredients": [string], "instructions": [string], "cooking_time": number|null, "description": string|null, "tags": [string] }. 

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

BESCHREIBUNG: Wenn keine Beschreibung im Bild vorhanden ist, erstelle eine appetitliche, kurze Beschreibung (1-2 Sätze) basierend auf den Zutaten und der Art des Gerichts. Beispiele:
- "Ein saftiger Schokoladenkuchen mit intensivem Kakaogeschmack"
- "Cremige Pasta mit würziger Tomatensauce und frischen Kräutern"
- "Knuspriges Hähnchen mit mediterranen Gewürzen und Gemüse"

KOCHZEIT: Analysiere alle Zubereitungsschritte und summiere alle Zeitangaben (Backen, Kochen, Braten, Ruhen, etc.) zu einer Gesamtzeit in Minuten. Beispiele:
- "10 Min braten + 30 Min backen + 15 Min ruhen" = 55 Minuten
- "5 Min vorbereiten + 20 Min köcheln" = 25 Minuten
Falls keine Zeiten erkennbar sind, schätze basierend auf der Art des Gerichts.

TAGS: Erstelle mindestens 3 passende Tags für das Rezept basierend auf:
- Küche/Herkunft (z.B. "italienisch", "asiatisch", "mediterran")
- Hauptzutat (z.B. "hähnchen", "pasta", "vegetarisch")
- Art des Gerichts (z.B. "hauptgang", "dessert", "snack")
- Besonderheiten (z.B. "schnell", "gesund", "comfort-food")
Tags sollen in Kleinbuchstaben und ohne Leerzeichen sein (z.B. "tex-mex" statt "Tex Mex").

Wenn unlesbar: {"status":"unreadable","reason": "..."}`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
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
      // Continue without image if generation fails
    }

    let generatedImageUrl = null;
    
    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      const imageBase64Data = imageData.data[0].b64_json;
      
      if (imageBase64Data) {
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
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('recipe-images')
            .getPublicUrl(imageFileName);
          
          generatedImageUrl = publicUrl;
          console.log('✅ AI image generated and uploaded');
        }
      }
    }

    // Add the generated image URL to recipe data
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
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});