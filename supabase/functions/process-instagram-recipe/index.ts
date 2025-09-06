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
    // Initialize Supabase client first
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
    } else {
      // Handle JSON content (text or URL)
      const body = await req.json();
      
      // Get user preferences for language and measurement units
      if (body.userId) {
        const { data: profile } = await supabase.from('profiles')
          .select('language, measurement_unit')
          .eq('id', body.userId)
          .single();
        
        if (profile) {
          userPrefs = profile;
        }
      }
      
      if (body.url) {
        // Handle URL scraping
        const url = body.url;
        console.log('Processing URL:', url);
        
        try {
          // Validate URL
          new URL(url);
          
          // Fetch content from URL
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
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
              error: `Fehler beim Laden der URL: ${error.message}` 
            }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
      } else if (body.content) {
        // Handle direct text content
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

    // Extract recipe data with DeepSeek
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY nicht konfiguriert');
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
  "instructions": ["Schritt 1", "Schritt 2", ...],
  "cooking_time": Minuten_als_Zahl_oder_null,
  "servings": Portionen_als_Zahl_oder_null,
  "tags": ["tag1", "tag2", "tag3", ...]
}

WICHTIGE ANFORDERUNGEN:
- ${languageInstructions}
- ${measurementInstructions}
- Stelle sicher, dass alle Zutatenmengen das spezifizierte Maßsystem verwenden
- Halte Kochanweisungen klar und detailliert
- Erstelle mindestens 3 passende Tags für das Rezept basierend auf:
  * Küche/Herkunft (z.B. "italienisch", "asiatisch", "mediterran")
  * Hauptzutat (z.B. "hähnchen", "pasta", "vegetarisch")
  * Art des Gerichts (z.B. "hauptgang", "dessert", "snack")
  * Besonderheiten (z.B. "schnell", "gesund", "comfort-food")
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

    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
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
        data: {
          ...recipeData,
          image_url: finalImageUrl
        }
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