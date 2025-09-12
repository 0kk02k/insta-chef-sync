import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipeId, title, description, ingredients } = await req.json();
    
    if (!recipeId) {
      return new Response(
        JSON.stringify({ error: 'Recipe ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating image for recipe:', recipeId);

    const togetherApiKey = Deno.env.get('TOGETHER_API_KEY');
    if (!togetherApiKey) {
      throw new Error('Together API key not configured');
    }

    // Create detailed prompt for food photography with better specificity
    const ingredientsList = Array.isArray(ingredients) ? ingredients.slice(0, 6).join(', ') : '';
    
    // Detect dish category for better styling
    const isGerman = title.includes('deutsch') || ingredients.some(i => i.includes('Sauerkraut') || i.includes('Bratwurst'));
    const isDrink = ingredients.some(i => i.toLowerCase().includes('ml') && (i.includes('vodka') || i.includes('gin') || i.includes('prosecco'))) || title.toLowerCase().includes('cocktail') || title.toLowerCase().includes('drink');
    const isDessert = title.toLowerCase().includes('pudding') || title.toLowerCase().includes('kuchen') || title.toLowerCase().includes('torte') || ingredients.some(i => i.includes('Zucker') && i.includes('Ei'));
    
    let stylePrompt = '';
    if (isDrink) {
      stylePrompt = 'Professional cocktail photography, elegant glassware, garnished beautifully, condensation on glass, bar setting with ambient lighting';
    } else if (isDessert) {
      stylePrompt = 'Elegant dessert photography, artfully plated on fine china, dusted with powdered sugar, soft natural lighting, restaurant-quality presentation';
    } else if (isGerman) {
      stylePrompt = 'Traditional German cuisine photography, rustic wooden table, authentic ceramic plates, warm cozy lighting, hearty comfort food presentation';
    } else {
      stylePrompt = 'Professional food photography, modern plating, clean presentation on white plates, natural daylight, restaurant-quality styling';
    }
    
    const prompt = `${stylePrompt}. The dish is "${title}" - ${description || 'a delicious recipe'}. Key ingredients visible: ${ingredientsList}. Shot with a macro lens, shallow depth of field, appetizing colors, Instagram-worthy food styling, 4K quality, no text or watermarks, perfectly focused on the food.`;

    console.log('Generated prompt:', prompt);

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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Convert base64 to blob
    const imageBuffer = Uint8Array.from(atob(base64Image), c => c.charCodeAt(0));
    
    // Upload to Supabase Storage
    const fileName = `ai-generated-${recipeId}-${Date.now()}.png`;
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
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});