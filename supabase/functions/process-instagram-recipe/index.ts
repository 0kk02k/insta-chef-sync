import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { content } = body;
    
    // Validate input - content is required
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Rezepttext ist erforderlich' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing request with content length:', content.length);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const processContent = content.trim();

    console.log('Content extracted, analyzing with DeepSeek...');

    // 2. Extract recipe data with DeepSeek
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY nicht konfiguriert');
    }

    const prompt = `
Analysiere den folgenden Rezept-Inhalt und extrahiere Rezeptdaten. 
Antworte NUR mit einem gültigen JSON-Objekt ohne zusätzlichen Text:

{
  "title": "Rezeptname",
  "description": "Kurze Beschreibung",
  "ingredients": ["Zutat 1", "Zutat 2", ...],
  "instructions": ["Schritt 1", "Schritt 2", ...],
  "cooking_time": Minuten_als_Zahl_oder_null,
  "servings": Portionen_als_Zahl_oder_null
}

Rezept-Inhalt:
${processContent}
`;

    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein Rezept-Extraktions-Experte. Extrahiere Rezeptdaten aus Text-Inhalten und antworte nur mit gültigem JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('DeepSeek error:', errorText);
      throw new Error(`DeepSeek API Fehler: ${deepseekResponse.status}`);
    }

    const deepseekData = await deepseekResponse.json();
    const extractedText = deepseekData.choices[0]?.message?.content;
    
    if (!extractedText) {
      throw new Error('Keine Antwort von DeepSeek API');
    }

    console.log('Raw DeepSeek response:', extractedText);

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

    // Generate AI image for the recipe
    let finalImageUrl: string | null = null;
    console.log('Generating AI image...');
    try {
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
        if (openaiApiKey) {
          const imagePrompt = `A high-quality, appetizing food photograph of ${recipeData.title}. Professional food photography, well-lit, attractive presentation, restaurant quality.`;
          
          const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-image-1',
              prompt: imagePrompt,
              size: '1024x1024',
              quality: 'standard',
              n: 1
            }),
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            const imageBase64 = imageData.data[0].b64_json;
            
            // Upload image to Supabase Storage
            const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
            const fileName = `${Date.now()}-${recipeData.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('recipe-images')
              .upload(fileName, imageBuffer, {
                contentType: 'image/png'
              });

            if (!uploadError && uploadData) {
              const { data: { publicUrl } } = supabase.storage
                .from('recipe-images')
                .getPublicUrl(fileName);
              
              finalImageUrl = publicUrl;
              console.log('Generated and uploaded AI image:', finalImageUrl);
            }
          }
        }
    } catch (error) {
      console.error('Error generating AI image:', error);
      // Continue without image if generation fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...recipeData,
        image_url: finalImageUrl
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in process-instagram-recipe function:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unbekannter Fehler beim Verarbeiten des Rezepts',
        details: error.name || 'Unknown error type'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});