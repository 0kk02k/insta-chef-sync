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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY nicht konfiguriert');
    }

    const { recipeId, ingredients } = await req.json();
    if (!recipeId || !Array.isArray(ingredients) || ingredients.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'recipeId und ingredients sind erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user preferences via recipe -> user -> profile
    const { data: recipe, error: recipeErr } = await supabase
      .from('recipes')
      .select('user_id, servings')
      .eq('id', recipeId)
      .maybeSingle();
    if (recipeErr) throw recipeErr;

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

    const dsRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Du bist ein präziser Parser. Antworte ausschließlich mit valider JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1200,
      })
    });

    if (!dsRes.ok) {
      const t = await dsRes.text();
      console.error('DeepSeek Error:', t);
      throw new Error('DeepSeek API Fehler');
    }

    const data = await dsRes.json();
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