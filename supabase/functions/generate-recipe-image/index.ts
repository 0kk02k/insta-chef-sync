import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback prompt generation function
function generateFallbackPrompt(title: string, description: string, ingredients: string[]): string {
  const ingredientsList = Array.isArray(ingredients) ? ingredients.slice(0, 6).join(', ') : '';
  
  // Detect dish category for better styling
  const isGerman = title.includes('deutsch') || ingredients.some(i => i.includes('Sauerkraut') || i.includes('Bratwurst'));
  const isDrink = ingredients.some(i => i.toLowerCase().includes('ml') && (i.includes('vodka') || i.includes('gin') || i.includes('prosecco'))) || title.toLowerCase().includes('cocktail') || title.toLowerCase().includes('drink');
  const isDessert = title.toLowerCase().includes('pudding') || title.toLowerCase().includes('kuchen') || title.toLowerCase().includes('torte') || ingredients.some(i => i.includes('Zucker') && i.includes('Ei'));
  
  let stylePrompt = '';
  if (isDrink) {
    stylePrompt = 'Professional cocktail photography, elegant glassware, garnished beautifully, condensation on glass, bright white background or light marble surface, natural daylight, fresh and airy presentation';
  } else if (isDessert) {
    stylePrompt = 'Elegant dessert photography, artfully plated on white fine china, dusted with powdered sugar, bright soft natural lighting, clean white background, restaurant-quality presentation';
  } else if (isGerman) {
    stylePrompt = 'Traditional German cuisine photography, light wooden surface, white ceramic plates, bright natural lighting, hearty comfort food presentation, fresh and airy atmosphere';
  } else {
    stylePrompt = 'Professional food photography, modern plating, clean presentation on white plates, bright natural daylight, white or light background, restaurant-quality styling';
  }
  
  return `${stylePrompt}. The dish is "${title}" - ${description || 'a delicious recipe'}. Key ingredients visible: ${ingredientsList}. Shot with a macro lens, shallow depth of field, appetizing colors, Instagram-worthy food styling, 4K quality, no text or watermarks, perfectly focused on the food, bright and fresh aesthetic with light backgrounds.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Methode nicht erlaubt' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Allow': 'POST, OPTIONS' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authentication: Validate user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { recipeId, title, description, ingredients } = await req.json();
    
    if (!recipeId) {
      return new Response(
        JSON.stringify({ error: 'Recipe ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify recipe ownership
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('user_id')
      .eq('id', recipeId)
      .single();
    
    if (recipeError || !recipe) {
      return new Response(
        JSON.stringify({ error: 'Rezept nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check ownership
    if (recipe.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Keine Berechtigung für dieses Rezept' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating image for recipe:', recipeId);

    const togetherApiKey = Deno.env.get('TOGETHER_API_KEY');
    const xaiApiKey = Deno.env.get('XAI_API_KEY');
    
    if (!togetherApiKey) {
      throw new Error('Together API key not configured');
    }

    let prompt = '';
    
    // Try to generate enhanced prompt with xAI Grok first
    if (xaiApiKey) {
      try {
        console.log('Using xAI Grok to generate enhanced prompt...');
        
        const ingredientsList = Array.isArray(ingredients) ? ingredients.slice(0, 8).join(', ') : '';
        
        const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${xaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'grok-4-fast',
            messages: [
              {
                role: 'system',
                content: `You are a professional food photography expert specializing in creating prompts for AI image generation using FLUX.schnell. Your task is to create highly detailed, visually appealing prompts that will generate stunning food photography.

GUIDELINES:
- Focus on professional food styling and photography techniques
- ALWAYS use bright, fresh, light backgrounds - avoid dark or moody settings
- Use clean white backgrounds, light wood surfaces, or bright marble countertops
- Emphasize natural daylight, bright lighting, and fresh aesthetic
- Include specific lighting, composition, and plating details
- Consider cultural context but maintain bright, fresh presentation
- Specify camera settings and angles when relevant
- Include appetizing visual elements (steam, garnishes, textures)
- Avoid any text, watermarks, or labels in the image
- Keep prompts under 200 words but make them vivid and detailed

AESTHETIC REQUIREMENTS:
- Bright, airy, and fresh feeling
- Light backgrounds (white, light wood, bright marble)
- Natural daylight or bright soft lighting
- Clean, modern presentation
- Avoid dark wooden tables, dim lighting, or moody atmospheres

DISH CATEGORIES TO CONSIDER:
- German traditional dishes: rustic but bright, light wooden surfaces, natural daylight
- Desserts: elegant plating, white plates, bright soft lighting, clean presentation
- Drinks/Cocktails: bright backgrounds, clean glassware, fresh garnishes, well-lit setting
- International cuisine: modern plating, white surfaces, bright natural daylight

Return ONLY the prompt text, no explanations or additional text.`
              },
              {
                role: 'user',
                content: `Create a professional food photography prompt for this recipe:

Title: "${title}"
Description: ${description || 'No description provided'}
Key Ingredients: ${ingredientsList}

Generate a detailed FLUX.schnell prompt that will create an appetizing, professional photograph of this dish.`
              }
            ],
            temperature: 0.3,
            max_tokens: 300
          }),
        });

        if (grokResponse.ok) {
          const grokData = await grokResponse.json();
          prompt = grokData.choices[0].message.content.trim();
          console.log('xAI Grok generated prompt:', prompt);
        } else {
          throw new Error(`xAI Grok API error: ${grokResponse.status}`);
        }
      } catch (grokError) {
        console.warn('xAI Grok prompt generation failed, falling back to template:', grokError instanceof Error ? grokError.message : String(grokError));
        prompt = generateFallbackPrompt(title, description, ingredients);
      }
    } else {
      console.log('xAI API key not available, using fallback prompt');
      prompt = generateFallbackPrompt(title, description, ingredients);
    }

    console.log('Final prompt for FLUX:', prompt);

    // Generate image with Together AI FLUX.schnell
    const imageResponse = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${togetherApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell',
        prompt: prompt,
        width: 1024,
        height: 1024,
        steps: 4,
        n: 1,
        response_format: 'b64_json'
      }),
    });

    if (!imageResponse.ok) {
      const error = await imageResponse.text();
      console.error('Together AI API error:', error);
      throw new Error(`Together AI API error: ${imageResponse.status}`);
    }

    const imageData = await imageResponse.json();
    const base64Image = imageData.data[0].b64_json;

    // Convert base64 to blob
    const imageBuffer = Uint8Array.from(atob(base64Image), c => c.charCodeAt(0));
    
    // Upload to Supabase Storage
    const fileName = `${user.id}/ai-generated-${recipeId}-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recipe-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(fileName);

    console.log('Image uploaded successfully:', publicUrl);

    // Update recipe with new image URL
    const { error: updateError } = await supabase
      .from('recipes')
      .update({ image_url: publicUrl })
      .eq('id', recipeId);

    if (updateError) {
      console.error('Recipe update error:', updateError);
      throw new Error(`Failed to update recipe: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: publicUrl,
        message: 'AI image generated and updated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-recipe-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate image', 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
