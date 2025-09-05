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
    const body = await req.json();
    const { instagram_url, content, type, filename } = body;
    
    // Validate input - either instagram_url or content is required
    if (!instagram_url && !content) {
      return new Response(
        JSON.stringify({ error: 'Instagram URL oder Content ist erforderlich' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing request:', { type, filename, hasInstagramUrl: !!instagram_url, hasContent: !!content });

    let processContent = content;

    // If we have an Instagram URL, scrape it with Firecrawl
    if (instagram_url) {
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
      processContent = scrapeData?.data?.content || scrapeData?.data?.markdown || '';
      
      if (!processContent) {
        throw new Error('Kein Content vom Instagram-Post extrahiert');
      }
    }

    // Handle PDF content
    if (type === 'pdf' && filename) {
      console.log('Processing PDF content...');
      // If content starts with "PDF file:", it means we got filename instead of content
      if (!processContent || processContent.trim().startsWith('PDF file:')) {
        throw new Error('Bitte kopieren Sie den Text aus der PDF und fügen Sie ihn in das Textfeld ein, anstatt die PDF-Datei hochzuladen.');
      }
    }
    
    if (!processContent) {
      throw new Error('Kein Content zum Verarbeiten gefunden');
    }

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

    return new Response(
      JSON.stringify({
        success: true,
        ...recipeData,
        instagram_url: instagram_url
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