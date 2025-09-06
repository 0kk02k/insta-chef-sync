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
            content: `You are a specialized recipe extraction AI. Your task is to analyze images containing recipes and extract structured recipe data. 

IMPORTANT: You must respond with a valid JSON object only, no additional text.

Extract the following information:
- title: Recipe name/title
- description: Brief description (optional)
- ingredients: Array of ingredient strings with amounts
- instructions: Array of step-by-step instructions
- cooking_time: Cooking time in minutes (if mentioned)
- servings: Number of servings (if mentioned)

If you can't find certain information, use null for optional fields or empty arrays for required arrays.

Example response format:
{
  "title": "Chocolate Chip Cookies",
  "description": "Delicious homemade cookies",
  "ingredients": ["2 cups flour", "1 cup sugar", "1/2 cup butter"],
  "instructions": ["Mix dry ingredients", "Add butter", "Bake for 12 minutes"],
  "cooking_time": 12,
  "servings": 24
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please extract the recipe information from this image. Look for ingredients, instructions, cooking times, and any other recipe details. If this is a screenshot of a recipe from a website, book, or handwritten note, extract all visible recipe content.

IMPORTANT REQUIREMENTS:
- ${userPrefs.language === 'de' ? 'Übersetze alle Texte ins Deutsche.' : 
   userPrefs.language === 'en' ? 'Translate all text to English.' :
   userPrefs.language === 'fr' ? 'Traduisez tout le texte en français.' :
   userPrefs.language === 'es' ? 'Traduce todo el texto al español.' :
   userPrefs.language === 'it' ? 'Traduci tutto il testo in italiano.' :
   'Keep text in original language.'}
- ${userPrefs.measurement_unit === 'metric' ? 'Convert all measurements to metric units (grams, kilograms, milliliters, liters, Celsius).' : 'Convert all measurements to imperial units (ounces, pounds, fluid ounces, cups, Fahrenheit).'}
- Ensure all ingredient quantities use the specified measurement system
- Keep cooking instructions clear and detailed`
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
      // Try to extract JSON from the response (handle cases where AI adds extra text)
      let jsonStr = extractedContent.trim();
      
      // Look for JSON object within the response
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
      }
      
      recipeData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('❌ Failed to parse extracted JSON:', extractedContent);
      console.error('❌ Parse error details:', parseError);
      
      // Fallback: try to extract basic recipe info using regex patterns
      try {
        const titleMatch = extractedContent.match(/["\']title["\']:\s*["\']([^"']+)["\']/) || 
                          extractedContent.match(/title:\s*([^\n,}]+)/i);
        const ingredientsMatch = extractedContent.match(/["\']ingredients["\']:\s*\[(.*?)\]/s);
        const instructionsMatch = extractedContent.match(/["\']instructions["\']:\s*\[(.*?)\]/s);
        
        if (titleMatch) {
          recipeData = {
            title: titleMatch[1].trim(),
            description: 'Rezept aus Screenshot extrahiert',
            ingredients: ingredientsMatch ? 
              ingredientsMatch[1].split(',').map(i => i.replace(/["\'\s]/g, '').trim()).filter(i => i) :
              ['Zutaten konnten nicht vollständig extrahiert werden'],
            instructions: instructionsMatch ? 
              instructionsMatch[1].split(',').map(i => i.replace(/["\'\s]/g, '').trim()).filter(i => i) :
              ['Anweisungen konnten nicht vollständig extrahiert werden'],
            cooking_time: null,
            servings: null
          };
          console.log('✅ Used fallback parsing for recipe data');
        } else {
          throw new Error('Failed to parse recipe data from image - no valid data found');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback parsing also failed:', fallbackError);
        throw new Error('Failed to parse recipe data from image');
      }
    }

    // Validate extracted data
    if (!recipeData.title || !Array.isArray(recipeData.ingredients) || !Array.isArray(recipeData.instructions)) {
      throw new Error('Invalid recipe data extracted from image');
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