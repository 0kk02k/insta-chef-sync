import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StructuredIngredient {
  amount: number | null;
  unit: string | null;
  ingredient: string;
}

// Input validation constants
const MAX_INGREDIENTS = 100;
const MAX_INGREDIENT_LENGTH = 500;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authentication: Validate user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const xaiApiKey = Deno.env.get('XAI_API_KEY');
    if (!xaiApiKey) {
      throw new Error('XAI_API_KEY nicht konfiguriert');
    }

    const { recipeId, ingredients } = await req.json();
    
    // Input validation
    if (!recipeId || typeof recipeId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'recipeId ist erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'ingredients Array ist erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (ingredients.length > MAX_INGREDIENTS) {
      return new Response(
        JSON.stringify({ success: false, error: `Maximal ${MAX_INGREDIENTS} Zutaten erlaubt` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate each ingredient
    for (const ingredient of ingredients) {
      if (typeof ingredient !== 'string' || ingredient.length > MAX_INGREDIENT_LENGTH) {
        return new Response(
          JSON.stringify({ success: false, error: 'Ungültige Zutat' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Verify recipe ownership
    const { data: recipe, error: recipeErr } = await supabase
      .from('recipes')
      .select('user_id, servings')
      .eq('id', recipeId)
      .maybeSingle();
    
    if (recipeErr) throw recipeErr;
    
    if (!recipe) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rezept nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check ownership
    if (recipe.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Keine Berechtigung für dieses Rezept' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let language = 'de';
    let unitPref = 'metric';

    if (recipe?.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('language, measurement_unit')
        .eq('id', recipe.user_id)
        .maybeSingle();
      if (profile) {
        language = profile.language || language;
        unitPref = profile.measurement_unit || unitPref;
      }
    }

    const languageInstructions = language === 'de' ? 
      'Übersetze alle Texte ins Deutsche.' : 
      language === 'en' ? 'Translate all text to English.' :
      language === 'fr' ? 'Traduisez tout le texte en français.' :
      language === 'es' ? 'Traduce todo el texto al español.' :
      language === 'it' ? 'Traduci tutto il testo in italiano.' :
      'Keep text in original language.';

    const measurementInstructions = unitPref === 'metric' ? 
      'Convert all measurements to metric units (grams, kilograms, milliliters, liters, Celsius).' :
      'Convert all measurements to imperial units (ounces, pounds, fluid ounces, cups, Fahrenheit).';

    const prompt = `Analysiere die folgende Zutatenliste und gib NUR ein gültiges JSON-Array structured_ingredients zurück.
Jedes Element: {"amount": number|null, "unit": string|null, "ingredient": string}

ANFORDERUNGEN:
- ${languageInstructions}
- ${measurementInstructions}
- Wenn keine messbare Menge vorhanden ist, setze amount und unit auf null
- Beispiele: "200g Mehl" → {"amount":200,"unit":"g","ingredient":"Mehl"}

ZUTATEN:\n${ingredients.map((i: string) => `- ${i}`).join('\n')}`;

    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${xaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-fast',
        messages: [
          { role: 'system', content: 'Du bist ein präziser Parser. Antworte ausschließlich mit valider JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1200,
      })
    });

    if (!grokRes.ok) {
      const t = await grokRes.text();
      console.error('xAI Grok Error:', t);
      throw new Error('xAI Grok API Fehler');
    }

    const data = await grokRes.json();
    let content = data.choices?.[0]?.message?.content || '';
    content = content.replace(/```json\n?|\n?```/g, '').trim();

    let structured: StructuredIngredient[];
    try {
      structured = JSON.parse(content);
      if (!Array.isArray(structured)) throw new Error('Kein Array');
    } catch (e) {
      console.error('Parse Error:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Ungültige AI-Antwort' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update DB
    const { error: updErr } = await supabase
      .from('recipes')
      .update({ structured_ingredients: structured })
      .eq('id', recipeId);
    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({ success: true, structured_ingredients: structured }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('restructure-ingredients error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Unbekannter Fehler' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
