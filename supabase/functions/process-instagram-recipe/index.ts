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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instagram_url } = await req.json();
    
    if (!instagram_url) {
      return new Response(
        JSON.stringify({ error: 'Instagram URL ist erforderlich' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing Instagram URL:', instagram_url);

    // 1. Scrape Instagram content with Firecrawl
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY nicht konfiguriert');
    }

    console.log('Scraping content with Firecrawl...');
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: instagram_url,
        pageOptions: {
          onlyMainContent: true
        }
      }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error('Firecrawl error:', errorText);
      throw new Error(`Fehler beim Scrapen: ${scrapeResponse.status}`);
    }

    const scrapeData = await scrapeResponse.json();
    const content = scrapeData?.data?.content || scrapeData?.data?.markdown || '';
    
    if (!content) {
      throw new Error('Kein Content vom Instagram-Post extrahiert');
    }

    console.log('Content extracted, analyzing with DeepSeek...');

    // 2. Extract recipe data with DeepSeek
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY nicht konfiguriert');
    }

    const prompt = `
Analysiere den folgenden Instagram-Post-Inhalt und extrahiere Rezeptdaten. 
Antworte NUR mit einem gültigen JSON-Objekt ohne zusätzlichen Text:

{
  "title": "Rezeptname",
  "description": "Kurze Beschreibung",
  "ingredients": ["Zutat 1", "Zutat 2", ...],
  "instructions": ["Schritt 1", "Schritt 2", ...],
  "cooking_time": Minuten_als_Zahl_oder_null,
  "servings": Portionen_als_Zahl_oder_null
}

Instagram-Post-Inhalt:
${content}
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
            content: 'Du bist ein Rezept-Extraktions-Experte. Extrahiere Rezeptdaten aus Instagram-Posts und antworte nur mit gültigem JSON.'
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

    return new Response(
      JSON.stringify({
        success: true,
        recipe: {
          ...recipeData,
          instagram_url: instagram_url
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in process-instagram-recipe function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unbekannter Fehler beim Verarbeiten des Rezepts'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});