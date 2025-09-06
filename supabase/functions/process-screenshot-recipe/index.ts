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

    const { imageBase64, fileName, userId } = await req.json();

    if (!imageBase64) {
      throw new Error('No image data provided');
    }

    console.log('📸 Processing screenshot with GPT-5 Nano Vision API');

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

    // Step 1: Extract text and recipe data from screenshot using GPT-5 Nano Vision
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano-2025-08-07',
        max_completion_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: `You are a specialized recipe extraction AI. Extract recipe information from images and respond with ONLY a valid JSON object.

Required format:
{
  "title": "Recipe name",
  "description": "Brief description",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["step 1", "step 2"],
  "cooking_time": 30,
  "servings": 4
}

Rules:
- Response must be valid JSON only
- No additional text before or after JSON
- Use null for missing optional fields
- Empty arrays for missing required arrays`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract recipe from this image. Requirements:
- ${userPrefs.language === 'de' ? 'Übersetze alle Texte ins Deutsche.' : 
   userPrefs.language === 'en' ? 'Translate all text to English.' :
   userPrefs.language === 'fr' ? 'Traduisez tout le texte en français.' :
   userPrefs.language === 'es' ? 'Traduce todo el texto al español.' :
   userPrefs.language === 'it' ? 'Traduci tutto il testo in italiano.' :
   'Keep text in original language.'}
- ${userPrefs.measurement_unit === 'metric' ? 'Convert measurements to metric (grams, kg, ml, liters, Celsius).' : 'Convert measurements to imperial (oz, lbs, cups, Fahrenheit).'}
- Return only valid JSON, no other text`
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
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('❌ OpenAI Vision API error:', errorText);
      throw new Error(`OpenAI Vision API error: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    console.log('✅ GPT-5 Nano Vision response received');

    const extractedContent = visionData.choices[0].message.content;
    console.log('📝 Raw AI response:', extractedContent);
    
    let recipeData: RecipeData;
    try {
      // Clean and extract JSON from response
      let jsonStr = extractedContent.trim();
      
      // Remove any markdown code blocks
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Look for JSON object within the response
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
      }
      
      console.log('🔍 Cleaned JSON string:', jsonStr);
      recipeData = JSON.parse(jsonStr);
      
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
      
    } catch (parseError) {
      console.error('❌ Failed to parse extracted JSON:', extractedContent);
      console.error('❌ Parse error details:', parseError);
      
      if (parseError instanceof Error && parseError.message.includes('erkennbar')) {
        throw parseError;
      }
      
      throw new Error('Das Rezept im Screenshot konnte nicht richtig erkannt werden. Bitte verwenden Sie ein klareres Bild oder einen anderen Upload-Typ.');
    }

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