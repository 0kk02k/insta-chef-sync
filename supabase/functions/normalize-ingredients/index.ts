import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShoppingListItem {
  id: string;
  ingredient_name: string;
  amount: number | null;
  unit: string | null;
}

interface NormalizedIngredient {
  canonical_name: string;
  amount: number | null;
  unit: string | null;
  original_items: string[];
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

    const { existingItems, newIngredients, shoppingListId } = await req.json();
    
    if (!shoppingListId || !Array.isArray(newIngredients)) {
      return new Response(
        JSON.stringify({ success: false, error: 'shoppingListId und newIngredients sind erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user preferences
    const { data: listData } = await supabase
      .from('shopping_lists')
      .select('user_id')
      .eq('id', shoppingListId)
      .single();

    let language = 'de';
    let unitPref = 'metric';

    if (listData?.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('language, measurement_unit')
        .eq('id', listData.user_id)
        .single();
      if (profile) {
        language = profile.language || language;
        unitPref = profile.measurement_unit || unitPref;
      }
    }

    // Create a comprehensive list for AI analysis
    const allItems = [
      ...existingItems.map((item: ShoppingListItem) => ({
        name: item.ingredient_name,
        amount: item.amount,
        unit: item.unit,
        type: 'existing',
        id: item.id
      })),
      ...newIngredients.map((ingredient: any) => ({
        name: ingredient.ingredient,
        amount: ingredient.amount,
        unit: ingredient.unit,
        type: 'new'
      }))
    ];

    const languageInstructions = language === 'de' ? 
      'Antworte auf Deutsch und verwende deutsche Zutatennamen.' : 
      language === 'en' ? 'Respond in English and use English ingredient names.' :
      language === 'fr' ? 'Répondez en français et utilisez des noms d\'ingrédients français.' :
      language === 'es' ? 'Responde en español y usa nombres de ingredientes en español.' :
      language === 'it' ? 'Rispondi in italiano e usa nomi di ingredienti italiani.' :
      'Respond in the original language.';

    const unitInstructions = unitPref === 'metric' ? 
      'Verwende metrische Einheiten (g, kg, ml, l).' :
      'Verwende imperiale Einheiten (oz, lb, fl oz, cups).';

    const prompt = `Analysiere diese Zutatenliste und führe ähnliche Zutaten zusammen. 
    
AUFGABE:
1. Erkenne Zutaten, die dasselbe Lebensmittel bezeichnen (z.B. "Tomate", "Tomaten", "tomate", "cherry tomaten")
2. Konvertiere Einheiten und addiere Mengen (z.B. 500g + 1kg = 1.5kg, 200ml + 1l = 1.2l)
3. Wähle die beste Einheit für die Gesamtmenge
4. Verwende kanonische deutsche Zutatennamen

REGELN:
- ${languageInstructions}
- ${unitInstructions}
- Fasse nur wirklich identische Zutaten zusammen (Tomaten ≠ Tomatensauce)
- Bei unklaren Fällen, erstelle separate Einträge
- Konvertiere: g↔kg (1000g=1kg), ml↔l (1000ml=1l), etc.

EINGABE: ${JSON.stringify(allItems)}

ANTWORT NUR als JSON Array:
[{
  "canonical_name": "string",
  "amount": number|null,
  "unit": "string"|null,
  "original_items": ["item_id_or_name"],
  "action": "merge"|"keep"|"add"
}]`;

    console.log('Sending request to DeepSeek with prompt:', prompt);

    const dsRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Du bist ein präziser Zutatennormalisierer. Antworte ausschließlich mit valider JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      })
    });

    if (!dsRes.ok) {
      const errorText = await dsRes.text();
      console.error('DeepSeek Error:', errorText);
      throw new Error('DeepSeek API Fehler');
    }

    const data = await dsRes.json();
    let content = data.choices?.[0]?.message?.content || '';
    content = content.replace(/```json\n?|\n?```/g, '').trim();

    console.log('DeepSeek response:', content);

    let normalizedItems: NormalizedIngredient[];
    try {
      normalizedItems = JSON.parse(content);
      if (!Array.isArray(normalizedItems)) throw new Error('Kein Array');
    } catch (e) {
      console.error('Parse Error:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Ungültige AI-Antwort' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        normalized_items: normalizedItems,
        debug: { original_count: allItems.length, normalized_count: normalizedItems.length }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('normalize-ingredients error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Unbekannter Fehler' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});